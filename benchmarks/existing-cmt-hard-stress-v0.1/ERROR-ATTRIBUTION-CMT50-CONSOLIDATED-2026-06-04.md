# CMT50 Consolidated Failure And Pass Audit 2026-06-04

## Conclusion

Latest per-item CMT50 evidence was consolidated after env reruns; failures were attributed and passing items were reviewed for capability evidence versus lucky/hallucinated hits.

- Latest score after env rerun overlay: `12/50`.
- JSON emission rate: `0.980`.
- Failure categories: `{'data_source': 2, 'answer_accuracy': 35, 'model_behavior': 1}`.
- Pass review categories: `{'capability_supported': 11, 'leakage_suspect': 1}`.
- Pass hallucination/lucky-hit risk: `{'medium': 7, 'low': 4, 'high': 1}`.

## Failed Item Attribution

| Problem | Field | Type | Actual | Expected | JSON | Primary | Next action |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `cmt_index_00_answer` | `HF` | `u_0/3+2u_1` | `U_1/2` | `True` | `data_source` | Audit or quarantine this source row before using it as clean model-failure evidence. |
| 2 | `cmt_index_01_answer` | `HF` | `c_↑dagger(k)c_↑(k);c_↓dagger(k)c_↓(k);c_↑dagger(k)c_↓(k);c_↓dagger(k)c_↑(k)` | `\langle c_\uparrow^\dagger(k) c_\uparrow(k) \rangle; \langle c_\downarrow^\dagger(k) c_...` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 3 | `cmt_index_02_answer` | `HF` | `[2.09, 0.56, 0.56, 2.09, -1.53, 1.53, -2.09, -0.56, -0.56, -2.09, 1.53, -1.53]` | `[2.09, 1.21, 0.0, 2.41, -2.09, 1.21, -2.09, -1.21, 0.0, -2.41, 2.09, -1.21]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 4 | `cmt_index_03_answer` | `HF` | `o(n_q^2)` | `16N_q^2` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 7 | `cmt_index_06_answer` | `VMC` | `["a"]` | `["a", "b", "d"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 8 | `cmt_index_07_answer` | `DMRG` | `["a"]` | `["d"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 9 | `cmt_index_08_answer` | `QMC` | `["f"]` | `["b", "f", "i"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 10 | `cmt_index_09_answer` | `QMC` | `["b", "c"]` | `["b", "e"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 12 | `cmt_index_11_answer` | `DMRG` | `2^cn` | `2^{N/2-1}; c=1/2` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 13 | `cmt_index_12_answer` | `DMRG` | `["b"]` | `["c"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 14 | `cmt_index_13_answer` | `VMC` | `["b"]` | `["d", "e"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 16 | `cmt_index_15_answer` | `ED` | `["a", "c"]` | `["a", "d"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 17 | `cmt_index_16_answer` | `ED` | `[5.0]` | `[7.0]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 18 | `cmt_index_17_answer` | `Other` | `-t(p^dagger_i,sigmap_j,sigma+p^dagger_j,sigmap_i,sigma)-u(m_i,uparrow-(1)/(2))(m_i,down...` | `-t (p^{\dagger}_{i,\sigma}p_{j,\sigma}+p^{\dagger}_{j,\sigma}p_{i,\sigma})-U (m_{i,\upa...` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 19 | `cmt_index_18_answer` | `QMC` | `["b", "c"]` | `["a", "b"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 20 | `cmt_index_19_answer` | `ED` | `["a", "c", "e", "g"]` | `["a"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 22 | `cmt_index_21_answer` | `PEPS` | `f=(partialn_k)/(partialb^)` | `N_k B` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 24 | `cmt_index_23_answer` | `Other` | `[0.2, 0.0769, 0.0629, 0.0527, 0.0422]` | `[0.2, 0.003, 0.017, 0.027, 0.038]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 26 | `cmt_index_25_answer` | `ED` | `[]` | `["b", "c", "e"]` | `False` | `model_behavior` | Add answer-finalization/self-stop policy and rerun this item. |
| 28 | `cmt_index_27_answer` | `QMC` | `["g"]` | `["d", "g"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 29 | `cmt_index_28_answer` | `DMRG` | `["b"]` | `["a"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 30 | `cmt_index_29_answer` | `Other` | `["b", "d", "e"]` | `["b", "c"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 31 | `cmt_index_30_answer` | `Other` | `["a", "c"]` | `["a", "b", "c"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 32 | `cmt_index_31_answer` | `Other` | `["a", "b", "c"]` | `["a", "c"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 33 | `cmt_index_32_answer` | `Other` | `1` | `\mu-tq^2B/4` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 34 | `cmt_index_33_answer` | `Other` | `["a", "c"]` | `["c"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 35 | `cmt_index_34_answer` | `Other` | `["a", "c", "d"]` | `["a", "c"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 37 | `cmt_index_36_answer` | `PEPS` | `["b", "c", "d"]` | `["g"]` | `True` | `data_source` | Audit or quarantine this source row before using it as clean model-failure evidence. |
| 38 | `cmt_index_37_answer` | `Other` | `[2.0, 3.0]` | `[1.0, 3.0]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 39 | `cmt_index_38_answer` | `Other` | `["a", "d", "g"]` | `["a", "d", "i"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 40 | `cmt_index_39_answer` | `Other` | `(2(t_2^2-t_1^2))/(t_2)((t_1)/(t_2))^n` | `2t_1(t_1/t_2)^n` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 41 | `cmt_index_40_answer` | `Other` | `["a", "e"]` | `["a", "d", "e"]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 42 | `cmt_index_41_answer` | `Other` | `frac2tanh((betahbaromega)/(2))hbaromegav` | `\frac{2\tanh(\frac{\beta \omega}{2})}{\omega}` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 43 | `cmt_index_42_answer` | `SM` | `-dfracgammatau^3v_0^2omega(gammatau+2m)(1+tau^2omega^2)[(gammatau+m)^2+m^2tau^2omega^2]` | `D_o = \frac{\tau^2 \rho v_0^2 \Omega (2+\rho)}{[(1+\rho)^2 + (\Omega \tau)^2][1+(\Omega...` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 44 | `cmt_index_43_answer` | `SM` | `a` | `c` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 45 | `cmt_index_44_answer` | `SM` | `sigmasqrtgamma` | `K_c = \sigma [1 - \frac{1}{\sqrt{3}}]\sqrt{\gamma + \frac{2\sigma^2}{3}(1 + \sqrt{1 + \...` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 47 | `cmt_index_46_answer` | `SM` | `((p+x^3)^2)/(4x^4)-(x^2)/(2)` | `\frac{(p + x^3)^2}{4 x^4} + 4 x^2` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |
| 50 | `cmt_index_49_answer` | `SM` | `[0.5, 0.36]` | `[0.33, 0.27]` | `True` | `answer_accuracy` | Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type. |

## Passed Item Review

| Problem | Field | Type | Actual | Evidence category | Risk | Confidence | Decision |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 5 | `cmt_index_04_answer` | `HF` | `c` | `capability_supported` | `medium` | `high` | Keep pass but review before using as strong capability evidence |
| 6 | `cmt_index_05_answer` | `ED` | `["a", "b", "d"]` | `capability_supported` | `medium` | `high` | Keep pass but review before using as strong capability evidence |
| 11 | `cmt_index_10_answer` | `QMC` | `["g"]` | `capability_supported` | `medium` | `high` | Keep pass but review before using as strong capability evidence |
| 15 | `cmt_index_14_answer` | `ED` | `["b", "e"]` | `capability_supported` | `medium` | `high` | Keep pass but review before using as strong capability evidence |
| 21 | `cmt_index_20_answer` | `ED` | `["a", "c"]` | `capability_supported` | `medium` | `high` | Keep pass but review before using as strong capability evidence |
| 23 | `cmt_index_22_answer` | `ED` | `[4.0]` | `capability_supported` | `low` | `high` | Count as capability-supported pass |
| 25 | `cmt_index_24_answer` | `QMC` | `["c", "d", "e"]` | `capability_supported` | `medium` | `high` | Keep pass but review before using as strong capability evidence |
| 27 | `cmt_index_26_answer` | `Other` | `o_n=e_n-e_n-1` | `capability_supported` | `low` | `high` | Count as capability-supported pass |
| 36 | `cmt_index_35_answer` | `Other` | `["a", "b"]` | `capability_supported` | `medium` | `high` | Keep pass but review before using as strong capability evidence |
| 46 | `cmt_index_45_answer` | `SM` | `d` | `leakage_suspect` | `high` | `low` | Keep pass but review before using as strong capability evidence |
| 48 | `cmt_index_47_answer` | `Other` | `[2.0, 2.0, 1.0]` | `capability_supported` | `low` | `high` | Count as capability-supported pass |
| 49 | `cmt_index_48_answer` | `PEPS` | `[6.0]` | `capability_supported` | `low` | `high` | Count as capability-supported pass |

## Pass Evidence Notes

- Problem `5`: reasoning contains uncertainty language; substantial item-specific reasoning before correct JSON; single-letter symbolic pass has option-like lucky-hit risk
- Problem `6`: reasoning contains uncertainty language; substantial item-specific reasoning before correct JSON; choice-set pass still has lucky-hit risk unless validated by paraphrase rerun
- Problem `11`: reasoning contains uncertainty language; substantial item-specific reasoning before correct JSON; choice-set pass still has lucky-hit risk unless validated by paraphrase rerun
- Problem `15`: reasoning contains uncertainty language; substantial item-specific reasoning before correct JSON; choice-set pass still has lucky-hit risk unless validated by paraphrase rerun
- Problem `21`: reasoning contains uncertainty language; substantial item-specific reasoning before correct JSON; choice-set pass still has lucky-hit risk unless validated by paraphrase rerun
- Problem `23`: reasoning contains uncertainty language; substantial item-specific reasoning before correct JSON
- Problem `25`: reasoning contains uncertainty language; substantial item-specific reasoning before correct JSON; choice-set pass still has lucky-hit risk unless validated by paraphrase rerun
- Problem `27`: reasoning contains uncertainty language; substantial item-specific reasoning before correct JSON
- Problem `36`: reasoning contains uncertainty language; substantial item-specific reasoning before correct JSON; choice-set pass still has lucky-hit risk unless validated by paraphrase rerun
- Problem `46`: reasoning contains uncertainty language; output/reasoning mentions gold or answer key
- Problem `48`: reasoning contains uncertainty language; substantial item-specific reasoning before correct JSON
- Problem `49`: reasoning contains uncertainty language; substantial item-specific reasoning before correct JSON

## Iteration Decision

- `answer_accuracy`: Cluster failed items by CMT type and build focused probes for each cluster. Why: Most latest failures are wrong-but-parseable answers, not JSON emission failures. Retest: Rerun one representative per cluster before rerunning CMT50.
- `model_behavior`: Add final-answer forcing/self-stop after a bounded reasoning budget. Why: Item 26 showed continuous reasoning for about 2401 s without stdout JSON. Retest: Rerun item 26 and compare time-to-JSON.
- `success_review`: Treat low-risk capability-supported passes as positive exemplars; manually review medium-risk passes before using them as capability claims. Why: A passed verifier result alone can hide lucky option hits or source artifacts. Retest: Rerun medium-risk passes with paraphrased prompts or stricter derivation requirements.
