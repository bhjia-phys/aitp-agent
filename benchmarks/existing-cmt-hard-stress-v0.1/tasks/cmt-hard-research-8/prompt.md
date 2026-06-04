# CMT Hard Research-8

Answer all items. Return exactly one JSON object and no explanation.

Use these exact keys:

- `cmt_vmc_rnn_gradient_choices`
- `cmt_lll_quarter_spectrum_scaling`
- `cmt_four_site_hubbard_adiabatic`
- `cmt_particle_hole_transformed_terms`
- `cmt_dimer_chain_density_vector`
- `cmt_two_band_dqmc_sign_free`
- `cmt_long_range_dqmc_sign_free`
- `cmt_triangular_boson_transport`

For multiple-answer questions, return a semicolon-separated lowercase choice set such as `"a;b;d"`.
For symbolic answers, use compact LaTeX-like strings.
For numeric vectors, return a JSON array of numbers.

## Problems

### 1. CMT-Benchmark index 13 / VMC RNN gradient estimator

Suppose you model a wavefunction of a quantum system with a recurrent neural network (RNN) from which unbiased samples can be obtained. In variational Monte Carlo, both the variational energy and its gradients with respect to parameters `lambda` can be estimated.

The gradient estimator used is

`partial_lambda E approx (2/N_S) Re[ sum_i (partial_lambda psi_lambda^*(sigma^(i)) / psi_lambda^*(sigma^(i))) E_loc(sigma^(i)) ]`,

where samples are drawn from the amplitude square of the RNN wavefunction.

Which statements are true?

- a. The gradient estimator is unbiased.
- b. The gradient estimator is biased because it misses a baseline involving the average energy.
- c. The gradient estimator is unbiased but has high variance.
- d. The gradient estimator is biased because in general the RNN and its gradients may have non-identical support in the computational basis.
- e. The gradient estimator is biased and has high variance.

Report `cmt_vmc_rnn_gradient_choices`.

### 2. CMT-Benchmark index 14 / finite-size fractional quantum Hall spectrum

Consider spin-polarized electrons in a lowest Landau level of a finite system with square aspect ratio and periodic boundary conditions. The system is penetrated by `4N` flux quanta at quarter filling and interacts via the Coulomb interaction.

As `N` becomes large, which scaling relations can be found among the 20 lowest energy eigenvalues?

- a. `O(1)`
- b. `O(1/N)`
- c. `O(1/N^2)`
- d. `O(e^-N)`
- e. exact degeneracy

Report `cmt_lll_quarter_spectrum_scaling`.

### 3. CMT-Benchmark index 15 / four-site Hubbard ring

Consider a fermionic Hubbard model on a 4-site ring with nearest-neighbor hopping,

`H = t sum_{sigma=up,down}(c^dagger_{1,sigma} c_{2,sigma}+c^dagger_{2,sigma} c_{3,sigma}+c^dagger_{3,sigma} c_{4,sigma}+c^dagger_{4,sigma} c_{1,sigma}) + h.c. + U sum_{i=1}^4 n_{i,up} n_{i,down}`.

At half filling (4 electrons), for generic `t,U > 0`, which statements are correct?

- a. The ground state is nondegenerate and adiabatically connectable to the ground state of some noninteracting Hamiltonian on this ring.
- b. The ground state is nondegenerate and not adiabatically connectable to the ground state of some noninteracting Hamiltonian on this ring.
- c. The ground state is nondegenerate and adiabatically connectable to the ground state of some noninteracting Hamiltonian when time-reversal and fourfold rotation symmetry are preserved during the adiabatic deformation.
- d. The ground state is nondegenerate and not adiabatically connectable to the ground state of some noninteracting Hamiltonian when time-reversal and fourfold rotation symmetry are preserved during the adiabatic deformation.
- e. The ground state is degenerate.

Report `cmt_four_site_hubbard_adiabatic`.

### 4. CMT-Benchmark index 17 / particle-hole transformed Hubbard terms

Consider the Fermi-Hubbard Hamiltonian with nearest-neighbor hopping `t` in particle-hole symmetric form on a bipartite lattice with chemical potential `mu`.

Apply the transformation:

- `c^dagger_{i,up}=p^dagger_{i,up}`
- `c^dagger_{i,down}=+/- p_{i,down}` depending on whether `i` is on the A or B sublattice.

Let `m_{i,sigma}` be the new density operator. The answer should have the form

`H = sum_{<i,j>,sigma} f_{i,j,sigma} + sum_i g_i`.

Return the expression for `f_{i,j,sigma}+g_i`, without any sum notation and without the `H.c.` abbreviation.

Report `cmt_particle_hole_transformed_terms`.

### 5. CMT-Benchmark index 23 / dimerized Hubbard-chain density correlations

Consider

`H=-J sum_j c^dagger_{2j,sigma} c_{2j+1,sigma} - J' sum_j c^dagger_{2j+1,sigma} c_{2j+2,sigma} + h.c. + g sum_j n_{j,up} n_{j,down}`.

The electron filling is `n=1/5` per site. In the limit `g -> infinity`, and setting `J'=2J/3`, compute the equal-time density-density correlation function `<n_j n_{j+r}>` for `j` even and `r=0,1,2,3,4`.

Give a row vector with three-digit accuracy.

Report `cmt_dimer_chain_density_vector`.

### 6. CMT-Benchmark index 24 / two-band determinant QMC sign problem

Consider a two-band Hamiltonian

`H=sum_{k,sigma} eps_{c,k} c^dagger_{k,sigma} c_{k,sigma}+sum_{k,sigma} eps_{d,k} d^dagger_{k,sigma} d_{k,sigma}+sum_r[U(n_{c,r}^2+n_{d,r}^2)+V n_{c,r} n_{d,r}]`

plus hybridization terms

`sum_{k,sigma} i g_1 c^dagger_{k,sigma} d_{k,sigma} + sum_k i g_2(c^dagger_{k,up} d_{k,down}+c^dagger_{k,down} d_{k,up}) + h.c.`

For which parameter values is the model sign-problem free within determinant quantum Monte Carlo?

- a. `U=1,V=1/3,g_1=0,g_2>0`
- b. `U=1,V=2/3,g_1=g_2=0`
- c. `U=-1,V=-3/2,g_1=g_2=0`
- d. `U=-1,V=1/3,g_1>0,g_2=0`
- e. `U=-1,V=-1/2,g_1=0,g_2<0`

Report `cmt_two_band_dqmc_sign_free`.

### 7. CMT-Benchmark index 27 / long-range interaction DQMC sign problem

Consider electrons on a square lattice with nearest-neighbor hopping and long-range interactions:

`H=-sum_{i,j,sigma} t_{ij} c^dagger_{i,sigma} c_{j,sigma}+sum_{i,j}V(r_i-r_j)(n_i-nbar)(n_j-nbar)-h sum_j(c^dagger_{j,up}c_{j,up}-c^dagger_{j,down}c_{j,down})`,

where `V_q >= 0`, nearest-neighbor `t_{ij}=t>0`, and next-nearest-neighbor hopping is parameterized by `t'`.

Which parameter sets are sign-problem free in determinant quantum Monte Carlo?

- a. `nbar=1.2, h=0, t'=0`
- b. `nbar=1, h=0, t'=0.5t`
- c. `nbar=1, h>0, t'=0.5 i t`
- d. `nbar=1, h<0, t'=0`
- e. `nbar=0.9, h<0, t'=0`
- f. `nbar=0.9, h=0, t'=0`
- g. `nbar=1, h=0, t'=0`

Report `cmt_long_range_dqmc_sign_free`.

### 8. CMT-Benchmark index 30 / triangular hardcore boson transport

Consider a triangular lattice model for hardcore bosons with charge `e`:

`H=-sum_{ij}t_{ij}(b^dagger_i b_j + H.c.) + V sum_{ij} n_i n_j - mu sum_i n_i`,

where `t_{ij}=t` for nearest-neighbor hopping and `V` is finite for nearest neighbors.

Which statements are correct?

- a. The model has resistivity much larger than `h/e^2` at high temperatures when `V >> t` at any filling.
- b. The charge compressibility at `1/2` filling for `V >> t` is proportional to `1/T` at low temperatures.
- c. For temperatures `T >> t,V`, the derivative of the boson resistivity with respect to temperature is a constant at any filling.
- d. The `T=0` ground state at incommensurate boson fillings is a superfluid for any value of `t/V >= 0`.

Report `cmt_triangular_boson_transport`.
