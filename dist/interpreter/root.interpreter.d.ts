import { NodeType } from "lezer";
import { IInterpreter } from "@dev4light/lezer-editor-common";
export declare class RootInterpreter implements IInterpreter {
    evaluate(node: NodeType, input: string, args: any[]): any;
}
