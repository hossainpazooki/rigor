# 2026-08-22 - kustomize render deterministic but ci substitutes bytes

ts: 2026-08-22T16:34:12Z
commit: a8f1bb6 (rigor); regulatory-rule-engine d7aba0f
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: the reviewed rendered prod manifest (placeholders) and the applied one (image substituted inside the CI job) differ by construction - release-artifact-integrity's twin is red on the real first domain without planting; kustomize rendering itself is byte-deterministic there
basis: kubectl kustomize kube/overlays/prod twice -> both sha256 2ca713b1c30f47662b00bce23a660e4ff574e2b32330bf0474641ec1832a52e7 (156 lines; line 63 image: ${ECR_REGISTRY}/legal-compliance-frontend:${IMAGE_TAG}); replicas 2->3 copy -> 047d87df274a359456dbfa8722527a235f704c931dbc833aa484c42aa4a818a6; CI kustomize-edit-set-image copy -> 643e2da2ebe5343e0c825be96a2fde63d366250b3024986b4c7dde044495f3e7; cd-production.yml:10 skip-approval, :110 if: failure(), :114 rollout undo, :130 sleep 30, :135 for i in {1..6}, :136 curl -sf https://legal-compliance.example.com/
re-verify: cd ~/dev/regulatory-rule-engine && kubectl kustomize kube/overlays/prod | sha256sum
