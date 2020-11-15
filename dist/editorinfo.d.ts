import { IInterpreter } from '@dev4light/lezer-editor-common';
declare function getGrammarTags(): string[];
declare function getInterpreter(grammarTag: any): IInterpreter | null;
declare function getTokenType(node: any): "error" | "builtin" | "name";
declare const EditorInfo: {
    getGrammarTags: typeof getGrammarTags;
    getInterpreter: typeof getInterpreter;
    getTokenType: typeof getTokenType;
};
export default EditorInfo;
