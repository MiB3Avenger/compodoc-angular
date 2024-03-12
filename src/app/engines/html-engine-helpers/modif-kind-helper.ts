import { IHtmlEngineHelper } from './html-engine-helper.interface';
const Handlebars = require('handlebars');

import { ts, SyntaxKind } from 'ts-morph';

export class ModifKindHelper implements IHtmlEngineHelper {
    /**
     * Transform SyntaxKind into string
     * @param  {any}           context Handlebars context
     * @param  {SyntaxKind[]} kind  SyntaxKind concatenated
     * @return {string}                Parsed string
     */
    public helperFunc(context: any, kind: SyntaxKind[]) {
        let _kindText = '';
        switch (kind) {
            // @ts-ignore
            case SyntaxKind.PrivateKeyword:
                _kindText = 'Private';
                break;
            // @ts-ignore
            case SyntaxKind.ReadonlyKeyword:
                _kindText = 'Readonly';
                break;
            // @ts-ignore
            case SyntaxKind.ProtectedKeyword:
                _kindText = 'Protected';
                break;
            // @ts-ignore
            case SyntaxKind.PublicKeyword:
                _kindText = 'Public';
                break;
            // @ts-ignore
            case SyntaxKind.StaticKeyword:
                _kindText = 'Static';
                break;
            // @ts-ignore
            case SyntaxKind.AsyncKeyword:
                _kindText = 'Async';
                break;
            // @ts-ignore
            case SyntaxKind.AbstractKeyword:
                _kindText = 'Abstract';
                break;
        }
        return new Handlebars.SafeString(_kindText);
    }
}
