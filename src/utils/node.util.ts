import { ts } from 'ts-morph';

export function nodeHasDecorator(node: ts.Node) {
    let result = false;

    // @ts-ignore
    const nodeModifiers = node.modifiers; // ts.getModifiers(node);

    if (nodeModifiers && nodeModifiers.length > 0) {
        nodeModifiers.forEach(nodeModifier => {
            if (nodeModifier.kind === ts.SyntaxKind.Decorator) {
                result = true;
            }
        });
    }

    return result;
}

export function getNodeDecorators(node: ts.Node) {
    let result = [];

    // @ts-ignore
    const nodeModifiers = node.modifiers; // ts.getModifiers(node);

    if (nodeModifiers && nodeModifiers.length > 0) {
        nodeModifiers.forEach(nodeModifier => {
            if (nodeModifier.kind === ts.SyntaxKind.Decorator) {
                result.push(nodeModifier);
            }
        });
    }

    return result;
}
