import { SymbolHelper } from './symbol-helper';
import { ts, SyntaxKind } from 'ts-morph';
import { expect } from 'chai';

describe(SymbolHelper.name, () => {
    let helper: SymbolHelper;

    beforeEach(() => {
        helper = new SymbolHelper();
    });

    describe('parseProviderConfiguration', () => {
        it('should handle property is identifier', () => {
            // { provide: APP_BASE_HREF, useValue: '/' }
            // @ts-ignore
            const provideProperty = ts.createPropertyAssignment(
                'provide',
                // @ts-ignore
                ts.createIdentifier('APP_BASE_HREF')
            );
            // @ts-ignore
            const useValue = ts.createPropertyAssignment('useValue', ts.createLiteral('/'));

            // @ts-ignore
            const obj = ts.createObjectLiteral([provideProperty, useValue]);
            const result = helper.parseProviderConfiguration(obj);

            expect(result).to.equal('{ provide: APP_BASE_HREF, useValue: "/" }');
        });

        it('should handle property is array', () => {
            // { deps: ['d1', 'd2'] }

            // @ts-ignore
            const array = ts.createArrayLiteral([ts.createLiteral('d1'), ts.createLiteral('d2')]);

            // @ts-ignore
            const obj = ts.createObjectLiteral([ts.createPropertyAssignment('deps', array)]);
            const result = helper.parseProviderConfiguration(obj);

            expect(result).to.equal('{ deps: ["d1", "d2"] }');
        });

        it('should handle lambda', () => {
            // { useFactory: (d1, d2) => new Date() }

            // @ts-ignore
            const dateCall = ts.createNew(ts.createIdentifier('Date'), [], []);
            // @ts-ignore
            const arrowFunc = ts.createArrowFunction(
                [],
                [],
                [
                    // @ts-ignore
                    ts.createParameter([], [], undefined, 'd1'),
                    // @ts-ignore
                    ts.createParameter([], [], undefined, 'd2')
                ],
                undefined,
                // @ts-ignore
                ts.createToken(SyntaxKind.EqualsGreaterThanToken),
                dateCall
            );

            // @ts-ignore
            const obj = ts.createObjectLiteral([
                // @ts-ignore
                ts.createPropertyAssignment('useFactory', arrowFunc)
            ]);
            const result = helper.parseProviderConfiguration(obj);

            expect(result).to.equal('{ useFactory: (d1, d2) => new Date() }');
        });
    });

    describe('buildIdentifierName', () => {
        it('should handle RouterModule.forRoot', () => {
            // "RouterModule.forRoot"
            // @ts-ignore
            const routerModule = ts.createIdentifier('RouterModule');
            // @ts-ignore
            const propertyAccess = ts.createPropertyAccess(routerModule, 'forRoot');

            const result = helper.buildIdentifierName(propertyAccess);

            expect(result).to.equal('RouterModule.forRoot');
        });
    });

    describe('parseSymbolElements', () => {
        it('should handle CallExpression and remove args', () => {
            // RouterModule.forRoot(args)
            // @ts-ignore
            const routerModule = ts.createIdentifier('RouterModule');
            // @ts-ignore
            const forRoot = ts.createPropertyAccess(routerModule, 'forRoot');

            // @ts-ignore
            const callExp = ts.createCall(forRoot, [], [ts.createLiteral('arg1')]);

            const result = helper.parseSymbolElements(callExp);

            expect(result).to.equal('RouterModule.forRoot(args)');
        });

        it('should handle sub-Module', () => {
            // Shared.Module
            // @ts-ignore
            const shared = ts.createIdentifier('Shared');
            // @ts-ignore
            const module = ts.createPropertyAccess(shared, 'Module');

            const result = helper.parseSymbolElements(module);

            expect(result).to.equal('Shared.Module');
        });

        it('should handle string literal', () => {
            // "./app.component.css"
            // @ts-ignore
            const stringLiteral = ts.createLiteral('./app.component.css');

            const result = helper.parseSymbolElements(stringLiteral);

            expect(result).to.equal('./app.component.css');
        });
    });
});
