#!/usr/bin/env bash
set -euo pipefail

echo "== pre-debug: basic env =="
echo "PWD: $(pwd)"
echo "whoami: $(whoami || true)"
echo "uname: $(uname -a || true)"
echo "date: $(date -u || true)"

echo
echo "== pre-debug: terraform version selection =="
echo "TFENV_TERRAFORM_DEFAULT_VERSION=${TFENV_TERRAFORM_DEFAULT_VERSION:-<unset>}"
echo "PATH=$PATH"
command -v terraform || true
command -v tfenv || true
command -v gpg || true
command -v gpgv || true

echo
echo "== pre-debug: tfenv =="
tfenv --version || true
ls -la "${HOME}/.tfenv" || true
find "${HOME}/.tfenv" -maxdepth 3 -type f 2>/dev/null | sort | sed -n '1,80p' || true

echo
echo "== pre-debug: gpg =="
gpg --version || true
gpg --list-keys || true
gpg --list-keys --with-colons 2>/dev/null | grep '^pub' || true

echo
echo "== pre-debug: terraform release endpoints =="
curl -I -s https://releases.hashicorp.com/terraform/1.9.8/index.json || true
curl -I -s https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_SHA256SUMS || true
curl -I -s https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_SHA256SUMS.sig || true

echo
echo "== pre-debug: repo version files =="
find "$TERRATEAM_ROOT" -maxdepth 3 \( -name '.terraform-version' -o -path '*/.terrateam/config.yml' \) -print || true
sed -n '1,120p' "$TERRATEAM_ROOT/.terrateam/config.yml" 2>/dev/null || true

echo
echo "== pre-debug done =="