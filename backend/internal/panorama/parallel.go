package panorama

import (
	"runtime"
	"sync"
)

// weightedSum is a partial sum of sample-weighted correlations.
type weightedSum struct{ sum, weight float64 }

// parallelWeightedMean evaluates fn for indices [0, n) concurrently and returns the combined weighted mean.
func parallelWeightedMean(n int, fn func(k int) weightedSum) float64 {
	parts := make([]weightedSum, n)
	jobs := make(chan int, n)
	for k := 0; k < n; k++ {
		jobs <- k
	}
	close(jobs)

	var wg sync.WaitGroup
	for w := 0; w < min(runtime.NumCPU(), n); w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for k := range jobs {
				parts[k] = fn(k)
			}
		}()
	}
	wg.Wait()

	total := weightedSum{}
	for _, p := range parts {
		total.sum += p.sum
		total.weight += p.weight
	}
	if total.weight == 0 {
		return 0
	}
	return total.sum / total.weight
}

// overlapContribution converts an overlap measurement into its weighted correlation share.
func overlapContribution(o overlap) weightedSum {
	if !o.valid {
		return weightedSum{}
	}
	return weightedSum{sum: o.ncc * float64(o.n), weight: float64(o.n)}
}
