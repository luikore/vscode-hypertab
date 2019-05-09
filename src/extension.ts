'use strict';
import * as vscode from 'vscode';

function log(s) {
    console.log(s)
}

export function activate(context: vscode.ExtensionContext) {
    var lastSuffix = "";
    var lastLine = -1;
    var candidates = [];

    let updateCandidates = function(textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, range: vscode.Range) {
        let prefixRange = new vscode.Range(range.start, textEditor.selection.start);
        let suffixRange = new vscode.Range(textEditor.selection.end, range.end);

        let document = textEditor.document;
        let prefix = document.getText(prefixRange);
        let suffix = document.getText(suffixRange);
        if (!prefix && !suffix) {
            lastSuffix = "";
            lastLine = range.start.line;
            candidates = [];
            return [range, suffix];
        }
        let currWord = document.getText(range);
        log("currWord: " + currWord);
        // prefix infix [cursor] suffix
        if (suffix === lastSuffix && candidates.length && lastLine === range.start.line && candidates[0] === currWord) {
            log("cycle");
        } else {
            log("new candidates");
            candidates = getMatchingWords(textEditor.document.getText(), prefix, suffix, range.start.line);
        }
        log(candidates);
        lastSuffix = suffix;
        lastLine = range.start.line;
        return suffix
    }

    let cycle = vscode.commands.registerTextEditorCommand("YAWCompletion.cycle", (textEditor, edit) => {
        let range = tabOrExpandSnippetOrRange(textEditor);
        if (!range) {
            return
        }
        let suffix = updateCandidates(textEditor, edit, range);
        if (candidates.length > 1) {
            let candidate = candidates.pop();
            edit.delete(range);
            edit.insert(range.start, candidate);
            candidates.unshift(candidate);
        }
    });
    context.subscriptions.push(cycle);

    let cycleBack = vscode.commands.registerTextEditorCommand("YAWCompletion.cycleBack", (textEditor, edit) => {
        let range = tabOrExpandSnippetOrRange(textEditor);
        if (!range) {
            return
        }
        let suffix = updateCandidates(textEditor, edit, range);
        if (candidates.length > 1) {
            let first = candidates.shift();
            candidates.push(first);
            edit.delete(range);
            edit.insert(range.start, candidates[0]);
        }
    });
    context.subscriptions.push(cycleBack);
}

export function tabOrExpandSnippetOrRange(textEditor: vscode.TextEditor): vscode.Range | null {
    let currPosition = textEditor.selection.active;
    let lineNum = currPosition.line;
    let col = currPosition.character;
    let line = textEditor.document.lineAt(lineNum).text;

    if (line.slice(0, col).trim() === "") {
        vscode.commands.executeCommand('tab')
        return null
    }

    let wordRange = textEditor.document.getWordRangeAtPosition(currPosition);
    if (wordRange) {
        return wordRange;
    }

    var prevWordRange: vscode.Range = null;
    var prevWord: string = null;
    if (col > 1 && line.charAt(col - 1) === ' ') {
        let pos = new vscode.Position(lineNum, col - 1);
        prevWordRange = textEditor.document.getWordRangeAtPosition(pos);
        if (prevWordRange) {
            prevWord = textEditor.document.getText(prevWordRange);
        }
    }
    if (prevWord) {
        insertSnippets(textEditor, prevWordRange, prevWord);
    }
    return null;
};

export async function insertSnippets(textEditor: vscode.TextEditor, prevWordRange: vscode.Range, prevWord: string) {
    await vscode.commands.executeCommand('cursorLeft');
    let uri = textEditor.document.uri;
    let sel = textEditor.selection.active;
    let list = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', uri, sel);
    for (let i in list["items"]) {
        let item:vscode.CompletionItem = list["items"][i]
        if (item.label.toString() === prevWord && item.insertText && item.kind === vscode.CompletionItemKind.Snippet) {
            let endPos = new vscode.Position(prevWordRange.end.line, prevWordRange.end.character + 1);
            let range = new vscode.Range(prevWordRange.start, endPos);
            let ss = item.insertText as vscode.SnippetString;
            textEditor.insertSnippet(ss, range);
        }
    }
    vscode.commands.executeCommand('cursorRight');
}

export function startOfLine(text: string, startLine: number) {
    let newLine = /\n/g;
    var matches;
    var start = 0;
    for (var i = 0; i < startLine; i++) {
        matches = newLine.exec(text);
        if (matches === null) {
            break;
        }
        start = matches.index;
    }
    return start;
}

export function mixReverse(preMatching, postMatching, prefix: string, suffix: string) {
    let matchingWords = [];
    let met = {};
    var i = preMatching.length - 1;
    var j = 0;
    for (; i >= 0 || j < postMatching.length; i--, j++) {
        if (i >= 0) {
            var w = preMatching[i];
            if (!met[w]) {
                met[w] = true;
                matchingWords.push(w);
            }
        }
        if (j < postMatching.length) {
            var w = postMatching[j];
            if (!met[w]) {
                met[w] = true;
                matchingWords.push(w);
            }
        }
    }
    matchingWords.push(prefix + suffix);
    matchingWords.reverse(); // NOTE: why reverse instead of iterating reversely? because the words near cursor should be balanced
    return matchingWords;
}

export function getMatchingWords(text: string, prefix: string, suffix: string, startLine: number) {
    if (text.length > 1000000) {
        text = text.slice(0, 1000000); // 1M safeguard
    }

    let start = startOfLine(text, startLine);
    var matches;

    // scan and classify pre / post matches
    let regex = new RegExp("\\b(" + prefix + "\\w+" + suffix + ")\\b", "gm");
    let preMatching = [];
    let postMatching = [];
    while ((matches = regex.exec(text)) !== null) {
        if (matches.index <= start) {
            preMatching.push(matches[1].trim())
        } else {
            postMatching.push(matches[1].trim())
        }
        if (preMatching.length > 50 || postMatching.length > 50) { // 100 safeguard
            break;
        }
    }

    let matchingWords = mixReverse(preMatching, postMatching, prefix, suffix);
    return matchingWords;
}

export function deactivate() {
}
