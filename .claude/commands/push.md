---
description: "Analyze changes and push to GitHub with auto-generated commit message"
allowed_tools: ["Bash", "Read"]
---

Analyze the current changes in the repository and create an appropriate commit message, then push all changes to GitHub:

1. First, check what files have been modified: !git status --porcelain
2. Review the actual changes: !git diff --staged HEAD
3. If there are unstaged changes, also show: !git diff HEAD
4. Based on the changes detected, craft a concise commit message that:
   - Summarizes the nature of changes (add/update/fix/refactor)
   - Focuses on the "why" rather than the "what" 
   - Maintains Iron Man theming if relevant
   - Follows the existing commit style from recent history
5. Use the push_all_changes.sh script with your crafted message: !./push_all_changes.sh "your commit message here"

Additional context or specific commit message guidance: $ARGUMENTS