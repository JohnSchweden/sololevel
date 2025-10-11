#!/bin/bash
set -e

# Generate commit message based on changed files
generate_commit_message() {
  local modified_files=$(git status --short | grep -E '^\s*M' | awk '{print $2}')
  local new_files=$(git status --short | grep -E '^\s*A|\?\?' | awk '{print $2}')
  local deleted_files=$(git status --short | grep -E '^\s*D' | awk '{print $2}')
  
  # Determine scope based on changed directories
  local has_expo=false
  local has_next=false
  local has_ui=false
  local has_app=false
  local has_api=false
  local has_docs=false
  local has_rules=false
  local has_config=false
  
  all_files="$modified_files $new_files $deleted_files"
  
  for file in $all_files; do
    case "$file" in
      apps/expo/*) has_expo=true ;;
      apps/next/*) has_next=true ;;
      packages/ui/*) has_ui=true ;;
      packages/app/*) has_app=true ;;
      packages/api/*) has_api=true ;;
      docs/*) has_docs=true ;;
      .cursor/*) has_rules=true ;;
      *.md|AGENTS.md) has_docs=true ;;
      *config*|*.json|*.mdc) has_config=true ;;
    esac
  done
  
  # Determine scope
  local scope="shared"
  if $has_expo && ! $has_next; then
    scope="native"
  elif $has_next && ! $has_expo; then
    scope="web"
  elif $has_ui; then
    scope="ui"
  elif $has_app; then
    scope="app"
  elif $has_api; then
    scope="api"
  fi
  
  # Determine type
  local type="chore"
  if [[ -n "$new_files" ]]; then
    type="feat"
  elif $has_docs || $has_rules; then
    type="docs"
  elif $has_config; then
    type="chore"
  else
    type="refactor"
  fi
  
  # Generate description
  local description=""
  if $has_rules; then
    description="update rules and documentation"
  elif $has_ui; then
    description="update UI components"
  elif $has_app; then
    description="update app features"
  elif $has_api; then
    description="update API integrations"
  elif $has_docs; then
    description="update documentation"
  elif $has_expo || $has_next; then
    description="update app configuration"
  else
    description="update project files"
  fi
  
  echo "${type}(${scope}): ${description}"
}

# Main execution
echo "🔍 Analyzing changes..."
commit_msg=$(generate_commit_message)

echo "📝 Commit message: $commit_msg"
echo ""

git add .
git commit -m "$commit_msg"

echo "🚀 Pushing to remote..."
git push

echo "✅ Done!"

