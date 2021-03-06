import { IInterpreter, IEditorInfo } from '@dev4light/lezer-editor-common';
import { RootInterpreter } from './interpreter/root.interpreter';

function getGrammarTags() {
  return ['Root', 'xxxxx'];
}

function getInterpreter(grammarTag): IInterpreter | null {
  if ('Root' === grammarTag) {
    return new RootInterpreter()
  }
  return null;
}

function getTokenType(node) {
  const {
    name,
    isError
  } = node;

  if (isError) {
    return 'error';
  }

  if (name === 'FunctionDefinition') {
    return 'builtin';
  }

  return 'name';
}

export const getEditorInfo : (() => IEditorInfo) = () => {
  return {
    getGrammarTags, getInterpreter, getTokenType
  }
}