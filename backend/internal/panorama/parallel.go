package panorama

import (
	"runtime"
	"sync"
)

// weightedSum is a partial sum of sample-weighted correlations.
type weightedSum struct{ sum, weight float64 }

// parallelFor runs fn for every index in [0, n) on a pool of goroutines sized to the CPU count.
func parallelFor(n int, fn func(k int)) {
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
				fn(k)
			}
		}()
	}
	wg.Wait()
}

// parallelWeightedMean evaluates fn for indices [0, n) concurrently and returns the combined weighted mean.
func parallelWeightedMean(n int, fn func(k int) weightedSum) float64 {
	parts := make([]weightedSum, n)
	parallelFor(n, func(k int) { parts[k] = fn(k) })

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
