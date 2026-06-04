# CMT50 No-Timeout Remaining Attribution Audit 2026-06-04

## Conclusion

Remaining no-timeout CMT50 items were audited item-by-item with emission, verifier, source-quality, and answer-accuracy evidence separated.

- Selected items: `47`
- Passed: `9/47`
- JSON emission rate: `0.809`
- Answer accuracy rate among emitted answers: `0.237`
- Dominant failure modes: `answer_accuracy;environment;data_source`

## Run Set

| Run label | Items | Passed | Runtime s | Path |
| --- | ---: | ---: | ---: | --- |
| `remaining-batch-a` | `12` | `3/12` | `7654.557` | `runs/20260603-233544__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__remaining_batch_a` |
| `remaining-batch-b` | `12` | `3/12` | `8495.088` | `runs/20260603-233544__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__remaining_batch_b` |
| `remaining-batch-c` | `12` | `2/12` | `8584.913` | `runs/20260603-233544__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__remaining_batch_c` |
| `remaining-batch-d` | `11` | `1/11` | `7744.523` | `runs/20260603-233544__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__remaining_batch_d` |

## Failure Breakdown

| Primary category | Count |
| --- | ---: |
| `answer_accuracy` | 28 |
| `data_source` | 1 |
| `environment` | 9 |

## Item-Level Attribution

| Problem | Field | CMT type | Actual | Expected | JSON | Primary | Source flags | Next action |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | `cmt_index_01_answer` | `HF` | `c_↑dagger(k)c_↑(k);c_↓dagger(k)c_↓(k);c_↑dagger(k)c_↓(k);c_↓dagger(k)c_↑(k)` | `\langle c_\uparrow^\dagger(k) c_\uparrow(k) \rangle; \langle c_\downarrow^\da...` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 3 | `cmt_index_02_answer` | `HF` | `[2.09, 0.56, 0.56, 2.09, -1.53, 1.53, -2.09, -0.56, -0.56, -2.09, 1.53, -1.53]` | `[2.09, 1.21, 0.0, 2.41, -2.09, 1.21, -2.09, -1.21, 0.0, -2.41, 2.09, -1.21]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 4 | `cmt_index_03_answer` | `HF` | `o(n_q^2)` | `16N_q^2` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 7 | `cmt_index_06_answer` | `VMC` | `["a"]` | `["a", "b", "d"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 8 | `cmt_index_07_answer` | `DMRG` | `["a"]` | `["d"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 9 | `cmt_index_08_answer` | `QMC` | `["f"]` | `["b", "f", "i"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 10 | `cmt_index_09_answer` | `QMC` | `["b", "c"]` | `["b", "e"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 12 | `cmt_index_11_answer` | `DMRG` | `2^cn` | `2^{N/2-1}; c=1/2` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 13 | `cmt_index_12_answer` | `DMRG` | `["b"]` | `["c"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 16 | `cmt_index_15_answer` | `ED` | `["a", "c"]` | `["a", "d"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 17 | `cmt_index_16_answer` | `ED` | `[5.0]` | `[7.0]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 18 | `cmt_index_17_answer` | `Other` | `-t(p^dagger_i,sigmap_j,sigma+p^dagger_j,sigmap_i,sigma)-u(m_i,uparrow-(1)/(2)...` | `-t (p^{\dagger}_{i,\sigma}p_{j,\sigma}+p^{\dagger}_{j,\sigma}p_{i,\sigma})-U ...` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 19 | `cmt_index_18_answer` | `QMC` | `["b", "c"]` | `["a", "b"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 20 | `cmt_index_19_answer` | `ED` | `["a", "c", "e", "g"]` | `["a"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 22 | `cmt_index_21_answer` | `PEPS` | `f=(partialn_k)/(partialb^)` | `N_k B` | `True` | `data_source` | `duplicate_option_labels` | Audit or quarantine this source row before using it as clean model-failure evidence. |
| 24 | `cmt_index_23_answer` | `Other` | `[]` | `[0.2, 0.003, 0.017, 0.027, 0.038]` | `False` | `environment` | `` | Wait for Kimi quota reset or use an available quota lane, then rerun this item; do not count it as a model-answer failure. |
| 25 | `cmt_index_24_answer` | `QMC` | `[]` | `["c", "d", "e"]` | `False` | `environment` | `` | Wait for Kimi quota reset or use an available quota lane, then rerun this item; do not count it as a model-answer failure. |
| 26 | `cmt_index_25_answer` | `ED` | `[]` | `["b", "c", "e"]` | `False` | `environment` | `` | Wait for Kimi quota reset or use an available quota lane, then rerun this item; do not count it as a model-answer failure. |
| 28 | `cmt_index_27_answer` | `QMC` | `["g"]` | `["d", "g"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 29 | `cmt_index_28_answer` | `DMRG` | `["b"]` | `["a"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 30 | `cmt_index_29_answer` | `Other` | `["b", "d", "e"]` | `["b", "c"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 31 | `cmt_index_30_answer` | `Other` | `["a", "c"]` | `["a", "b", "c"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 32 | `cmt_index_31_answer` | `Other` | `["a", "b", "c"]` | `["a", "c"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 33 | `cmt_index_32_answer` | `Other` | `1` | `\mu-tq^2B/4` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 34 | `cmt_index_33_answer` | `Other` | `["a", "c"]` | `["c"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 35 | `cmt_index_34_answer` | `Other` | `["a", "c", "d"]` | `["a", "c"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 38 | `cmt_index_37_answer` | `Other` | `[]` | `[1.0, 3.0]` | `False` | `environment` | `` | Wait for Kimi quota reset or use an available quota lane, then rerun this item; do not count it as a model-answer failure. |
| 39 | `cmt_index_38_answer` | `Other` | `[]` | `["a", "d", "i"]` | `False` | `environment` | `` | Wait for Kimi quota reset or use an available quota lane, then rerun this item; do not count it as a model-answer failure. |
| 40 | `cmt_index_39_answer` | `Other` | `none` | `2t_1(t_1/t_2)^n` | `False` | `environment` | `` | Restore Kimi CLI authentication, then rerun this item; do not count it as a model-answer failure. |
| 41 | `cmt_index_40_answer` | `Other` | `["a", "e"]` | `["a", "d", "e"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 42 | `cmt_index_41_answer` | `Other` | `frac2tanh((betahbaromega)/(2))hbaromegav` | `\frac{2\tanh(\frac{\beta \omega}{2})}{\omega}` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 43 | `cmt_index_42_answer` | `SM` | `-dfracgammatau^3v_0^2omega(gammatau+2m)(1+tau^2omega^2)[(gammatau+m)^2+m^2tau...` | `D_o = \frac{\tau^2 \rho v_0^2 \Omega (2+\rho)}{[(1+\rho)^2 + (\Omega \tau)^2]...` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 44 | `cmt_index_43_answer` | `SM` | `a` | `c` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 45 | `cmt_index_44_answer` | `SM` | `sigmasqrtgamma` | `K_c = \sigma [1 - \frac{1}{\sqrt{3}}]\sqrt{\gamma + \frac{2\sigma^2}{3}(1 + \...` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 47 | `cmt_index_46_answer` | `SM` | `((p+x^3)^2)/(4x^4)-(x^2)/(2)` | `\frac{(p + x^3)^2}{4 x^4} + 4 x^2` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 48 | `cmt_index_47_answer` | `Other` | `[]` | `[2.0, 2.0, 1.0]` | `False` | `environment` | `` | Wait for Kimi quota reset or use an available quota lane, then rerun this item; do not count it as a model-answer failure. |
| 49 | `cmt_index_48_answer` | `PEPS` | `[]` | `[6.0]` | `False` | `environment` | `duplicate_option_labels` | Wait for Kimi quota reset or use an available quota lane, then rerun this item; do not count it as a model-answer failure. |
| 50 | `cmt_index_49_answer` | `SM` | `[]` | `[0.33, 0.27]` | `False` | `environment` | `` | Wait for Kimi quota reset or use an available quota lane, then rerun this item; do not count it as a model-answer failure. |

## Passed Items

| Problem | Field | Actual | Expected |
| ---: | --- | --- | --- |
| 5 | `cmt_index_04_answer` | `c` | `c` |
| 6 | `cmt_index_05_answer` | `["a", "b", "d"]` | `["a", "b", "d"]` |
| 11 | `cmt_index_10_answer` | `["g"]` | `["g"]` |
| 15 | `cmt_index_14_answer` | `["b", "e"]` | `["b", "e"]` |
| 21 | `cmt_index_20_answer` | `["a", "c"]` | `["a", "c"]` |
| 23 | `cmt_index_22_answer` | `[4.0]` | `[4.0]` |
| 27 | `cmt_index_26_answer` | `o_n=e_n-e_n-1` | `O_n=E_n-E_{n-1}` |
| 36 | `cmt_index_35_answer` | `["a", "b"]` | `["a", "b"]` |
| 46 | `cmt_index_45_answer` | `d` | `d` |

## Probes

| Probe | Changed variable | Result | Interpretation |
| --- | --- | --- | --- |
| `remaining_no_timeout_batches` | removed fixed answer timeout and used 20-minute idle-output guard | 38/47 items emitted parseable JSON; 9/47 passed. | This separates answer-finalization failures from wrong-answer and source-quality failures. |
| `batch_runner_problem_list_fix` | used ProblemList string parsing for background batch launch | Initial background launch with a comma string failed at PowerShell int[] binding; ProblemList avoids that harness-only failure. | The failed initial launch is a harness issue and is excluded from model scoring. |

## Iteration Decision

- `answer_accuracy`: Cluster wrong-but-parseable answers by CMT type and build focused probes for the largest clusters. Why: These are clean model/domain misses once output and source quality are separated. Retest: Rerun one representative item per cluster after the reasoning intervention.
- `data_source`: Quarantine high-severity source-flag items from capability scoring until prompt/gold/options are audited. Why: Source defects produce misleading negative signal for agent iteration. Retest: Repair or exclude flagged items, then regenerate clean-subset score.
