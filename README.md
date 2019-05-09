# The Missing Tab Completion for VS Code

Redefine tab by quickly trigger a word-completion or snippet. No need to pop an annoying suggest menu!

- If the cursor is at the beginning of line, the tab key works as the original tab.
- If the cursor is beside or inside a word, insert in-file word completion.
- If the cursor is after a word and a **SPACE**, try expand a snippet.

In-file word completion mimics TextMate's Esc completion, so it can complete:

- prefix
- infix
- suffix

And, shift+tab will cycle back previous word.

## Commands

- `hypertab.tab`  -- `tab`
- `hypertab.tab.back` -- `shift+tab`

## Development

    npm install -g vsce
    vsce package
    code --install-extension *.vsix

## References

- [Another Word Completion](https://github.com/getogrand/another-word-completion) which is unmaintained
- [Supertab](https://github.com/ervandew/supertab)

## Release Notes

### 1.0.0

Initial release.
