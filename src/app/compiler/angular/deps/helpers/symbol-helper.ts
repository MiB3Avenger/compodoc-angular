import * as _ from 'lodash';

import { ts, SyntaxKind } from 'ts-morph';

import { TsPrinterUtil } from '../../../../../utils/ts-printer.util';

import ImportsUtil from '../../../../../utils/imports.util';

export class SymbolHelper {
    private readonly unknown = '???';

    public parseDeepIndentifier(name: string, srcFile?: ts.SourceFile): IParseDeepIdentifierResult {
        let result = {
            name: '',
            type: ''
        };

        if (typeof name === 'undefined') {
            return result;
        }
        let nsModule = name.split('.');
        let type = this.getType(name);

        if (nsModule.length > 1) {
            // @ts-ignore
            result.ns = nsModule[0];
            result.name = name;
            result.type = type;
            return result;
        }
        if (typeof srcFile !== 'undefined') {
            // @ts-ignore
            result.file = ImportsUtil.getFileNameOfImport(name, srcFile);
        }
        result.name = name;
        result.type = type;
        return result;
    }

    public getType(name: string): string {
        let type;
        if (name.toLowerCase().indexOf('component') !== -1) {
            type = 'component';
        } else if (name.toLowerCase().indexOf('pipe') !== -1) {
            type = 'pipe';
        } else if (name.toLowerCase().indexOf('controller') !== -1) {
            type = 'controller';
        } else if (name.toLowerCase().indexOf('module') !== -1) {
            type = 'module';
        } else if (name.toLowerCase().indexOf('directive') !== -1) {
            type = 'directive';
        } else if (
            name.toLowerCase().indexOf('injectable') !== -1 ||
            name.toLowerCase().indexOf('service') !== -1
        ) {
            type = 'injectable';
        }
        return type;
    }

    /**
     * Output
     * RouterModule.forRoot 179
     */
    public buildIdentifierName(
        node: ts.Identifier | ts.PropertyAccessExpression | ts.SpreadElement,
        name?
    ) {
        if (ts.isIdentifier(node) && !ts.isPropertyAccessExpression(node)) {
            return `${node.text}.${name}`;
        }

        name = name ? `.${name}` : '';

        let nodeName = this.unknown;
        // @ts-ignore
        if (node.name) {
            // @ts-ignore
            nodeName = node.name.text;
        // @ts-ignore
        } else if (node.text) {
            // @ts-ignore
            nodeName = node.text;
        } else if (node.expression) {
            // @ts-ignore
            if (node.expression.text) {
                // @ts-ignore
                nodeName = node.expression.text;
            // @ts-ignore
            } else if (node.expression.elements) {
                if (ts.isArrayLiteralExpression(node.expression)) {
                    // @ts-ignore
                    nodeName = node.expression.elements.map(el => el.text).join(', ');
                    nodeName = `[${nodeName}]`;
                }
            }
        }

        if (ts.isSpreadElement(node)) {
            return `...${nodeName}`;
        }
        // @ts-ignore
        return `${this.buildIdentifierName(node.expression, nodeName)}${name}`;
    }

    /**
     * parse expressions such as:
     * { provide: APP_BASE_HREF, useValue: '/' }
     * { provide: 'Date', useFactory: (d1, d2) => new Date(), deps: ['d1', 'd2'] }
     */
    public parseProviderConfiguration(node: ts.ObjectLiteralExpression): string {
        if (node.kind && node.kind === SyntaxKind.ObjectLiteralExpression) {
            // Search for provide: HTTP_INTERCEPTORS
            // and if true, return type: 'interceptor' + name
            let interceptorName, hasInterceptor;
            if (node.properties) {
                if (node.properties.length > 0) {
                    _.forEach(node.properties, property => {
                        if (property.kind && property.kind === SyntaxKind.PropertyAssignment) {
                            // @ts-ignore
                            if (property.name.text === 'provide') {
                                // @ts-ignore
                                if (property.initializer.text === 'HTTP_INTERCEPTORS') {
                                    hasInterceptor = true;
                                }
                            }
                            if (
                                // @ts-ignore
                                property.name.text === 'useClass' ||
                                // @ts-ignore
                                property.name.text === 'useExisting'
                            ) {
                                // @ts-ignore
                                interceptorName = property.initializer.text;
                            }
                        }
                    });
                }
            }
            if (hasInterceptor) {
                return interceptorName;
            } else {
                return new TsPrinterUtil().print(node);
            }
        } else {
            return new TsPrinterUtil().print(node);
        }
    }

    /**
     * Kind
     *  181 CallExpression => "RouterModule.forRoot(args)"
     *   71 Identifier     => "RouterModule" "TodoStore"
     *    9 StringLiteral  => "./app.component.css" "./tab.scss"
     */
    public parseSymbolElements(
        node:
            | ts.CallExpression
            | ts.Identifier
            | ts.StringLiteral
            | ts.PropertyAccessExpression
            | ts.SpreadElement
    ): string {
        // parse expressions such as: AngularFireModule.initializeApp(firebaseConfig)
        // if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        if (
            (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) ||
            // @ts-ignore
            (ts.isNewExpression(node) && ts.isElementAccessExpression(node.expression))
        ) {
            // @ts-ignore
            let className = this.buildIdentifierName(node.expression);

            // function arguments could be really complex. There are so
            // many use cases that we can't handle. Just print "args" to indicate
            // that we have arguments.

            let functionArgs = node.arguments.length > 0 ? 'args' : '';
            let text = `${className}(${functionArgs})`;
            return text;
        } else if (ts.isPropertyAccessExpression(node)) {
            // parse expressions such as: Shared.Module
            // @ts-ignore
            return this.buildIdentifierName(node);
        } else if (ts.isIdentifier(node)) {
            // parse expressions such as: MyComponent
            if (node.text) {
                return node.text;
            }
            if (node.escapedText) {
                return node.escapedText;
            }
        } else if (ts.isSpreadElement(node)) {
            // parse expressions such as: ...MYARRAY
            // Resolve MYARRAY in imports or local file variables after full scan, just return the name of the variable
            // @ts-ignore
            if (node.expression && node.expression.text) {
                // @ts-ignore
                return node.expression.text;
            }
        }

        // @ts-ignore
        return node.text ? node.text : this.parseProviderConfiguration(node);
    }

    /**
     * Kind
     *  177 ArrayLiteralExpression
     *  122 BooleanKeyword
     *    9 StringLiteral
     */
    private parseSymbols(
        node: ts.ObjectLiteralElement,
        srcFile: ts.SourceFile,
        decoratorType: string
    ): Array<string | boolean> {
        let localNode = node;

        if (ts.isShorthandPropertyAssignment(localNode) && decoratorType !== 'template') {
            // @ts-ignore
            localNode = ImportsUtil.findValueInImportOrLocalVariables(
                // @ts-ignore
                node.name.text,
                srcFile,
                decoratorType
            );
        }
        if (ts.isShorthandPropertyAssignment(localNode) && decoratorType === 'template') {
            const data = ImportsUtil.findValueInImportOrLocalVariables(
                // @ts-ignore
                node.name.text,
                srcFile,
                decoratorType
            );
            // @ts-ignore
            return [data];
        }

        // @ts-ignore
        if (localNode.initializer && ts.isArrayLiteralExpression(localNode.initializer)) {
            // @ts-ignore
            return localNode.initializer.elements.map(x => this.parseSymbolElements(x));
        } else if (
            // @ts-ignore
            (localNode.initializer && ts.isStringLiteral(localNode.initializer)) ||
            // @ts-ignore
            (localNode.initializer && ts.isTemplateLiteral(localNode.initializer)) ||
            // @ts-ignore
            (localNode.initializer &&
                ts.isPropertyAssignment(localNode) &&
                // @ts-ignore
                localNode.initializer.text)
        ) {
            // @ts-ignore
            return [localNode.initializer.text];
        } else if (
            // @ts-ignore
            localNode.initializer &&
            // @ts-ignore
            localNode.initializer.kind &&
            // @ts-ignore
            (localNode.initializer.kind === SyntaxKind.TrueKeyword ||
                // @ts-ignore
                localNode.initializer.kind === SyntaxKind.FalseKeyword)
        ) {
            // @ts-ignore
            return [localNode.initializer.kind === SyntaxKind.TrueKeyword ? true : false];
        // @ts-ignore
        } else if (localNode.initializer && ts.isPropertyAccessExpression(localNode.initializer)) {
            // @ts-ignore
            let identifier = this.parseSymbolElements(localNode.initializer);
            return [identifier];
        } else if (
            // @ts-ignore
            localNode.initializer &&
            // @ts-ignore
            localNode.initializer.elements &&
            // @ts-ignore
            localNode.initializer.elements.length > 0
        ) {
            // Node replaced by ts-simple-ast & kind = 265
            // @ts-ignore
            return localNode.initializer.elements.map(x => this.parseSymbolElements(x));
        }
    }

    public getSymbolDeps(
        props: ReadonlyArray<ts.ObjectLiteralElementLike>,
        decoratorType: string,
        srcFile: ts.SourceFile,
        multiLine?: boolean
    ): Array<string> {
        if (props.length === 0) {
            return [];
        }

        let i = 0,
            len = props.length,
            filteredProps = [];

        for (i; i < len; i++) {
            // @ts-ignore
            if (props[i].name && props[i].name.text === decoratorType) {
                filteredProps.push(props[i]);
            }
        }

        // @ts-ignore
        return filteredProps.map(x => this.parseSymbols(x, srcFile, decoratorType)).pop() || [];
    }

    public getSymbolDepsRaw(
        props: ReadonlyArray<ts.ObjectLiteralElementLike>,
        type: string,
        multiLine?: boolean
    ): Array<ts.ObjectLiteralElementLike> {
        // @ts-ignore
        return props.filter(node => node.name.text === type);
    }
}

export interface IParseDeepIdentifierResult {
    ns?: any;
    name: string;
    file?: string;
    type: string | undefined;
}
