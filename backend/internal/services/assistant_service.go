package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

const (
	openRouterEndpoint = "https://openrouter.ai/api/v1/chat/completions"
	assistantTimeout   = 30 * time.Second
	assistantMaxTokens = 600
	maxUpstreamBytes   = 1 << 20
)

// ErrAssistantUnavailable means the LLM is not configured or failed; clients should use offline answers.
var ErrAssistantUnavailable = errors.New("assistant unavailable")

// ChatMessage is one turn of the conversation sent to the model.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// AssistantService answers home-buying and selling questions grounded in real listings.
type AssistantService interface {
	Reply(ctx context.Context, history []ChatMessage, propertySlug string) (string, error)
}

type openRouterAssistant struct {
	apiKey   string
	model    string
	endpoint string
	client   *http.Client
	props    repositories.PropertyRepository
}

// NewAssistantService creates an OpenRouter-backed assistant; empty credentials make it report unavailable.
func NewAssistantService(apiKey, model string, props repositories.PropertyRepository) AssistantService {
	return newAssistantWithEndpoint(apiKey, model, openRouterEndpoint, props)
}

// newAssistantWithEndpoint allows tests to point the assistant at a fake server.
func newAssistantWithEndpoint(apiKey, model, endpoint string, props repositories.PropertyRepository) *openRouterAssistant {
	return &openRouterAssistant{
		apiKey: apiKey, model: model, endpoint: endpoint, props: props,
		client: &http.Client{Timeout: assistantTimeout},
	}
}

// Reply validates the history, adds listing context, and asks the model for an answer.
func (a *openRouterAssistant) Reply(ctx context.Context, history []ChatMessage, propertySlug string) (string, error) {
	if a.apiKey == "" || a.model == "" {
		return "", ErrAssistantUnavailable
	}
	clean, err := sanitizeHistory(history)
	if err != nil {
		return "", err
	}
	listings, _, err := a.props.ListPublished(ctx, maxContextListings, 0)
	if err != nil {
		return "", err
	}
	var current *models.Property
	if propertySlug != "" {
		current, _ = a.props.GetPublishedBySlug(ctx, propertySlug)
	}
	system := buildSystemPrompt(listings, current) + buildCalculationHint(clean[len(clean)-1].Content)
	messages := append([]ChatMessage{{Role: "system", Content: system}}, clean...)
	return a.complete(ctx, messages)
}

// complete calls the OpenRouter chat completions API and extracts the first answer.
func (a *openRouterAssistant) complete(ctx context.Context, messages []ChatMessage) (string, error) {
	payload, err := json.Marshal(map[string]interface{}{
		"model": a.model, "messages": messages, "max_tokens": assistantMaxTokens, "temperature": 0.3,
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.endpoint, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+a.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		slog.Warn("assistant upstream request failed", "error", err)
		return "", ErrAssistantUnavailable
	}
	defer resp.Body.Close()
	return parseCompletion(resp)
}

// parseCompletion reads the chat completion response, mapping any upstream problem to ErrAssistantUnavailable.
func parseCompletion(resp *http.Response) (string, error) {
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxUpstreamBytes))
	if err != nil || resp.StatusCode != http.StatusOK {
		slog.Warn("assistant upstream returned error", "status", resp.StatusCode, "body", truncateRunes(string(body), 300))
		return "", ErrAssistantUnavailable
	}
	var parsed struct {
		Choices []struct {
			Message ChatMessage `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil || len(parsed.Choices) == 0 {
		return "", fmt.Errorf("%w: malformed completion", ErrAssistantUnavailable)
	}
	answer := strings.TrimSpace(parsed.Choices[0].Message.Content)
	if answer == "" {
		return "", fmt.Errorf("%w: empty completion", ErrAssistantUnavailable)
	}
	return answer, nil
}
