import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../fillet/FilletDialog";
import { CharacterCurveParams } from './CharacterCurveFactory';

export class CharacterCurveDialog extends AbstractDialog<CharacterCurveParams> {
    constructor(protected readonly params: CharacterCurveParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { tMin, tMax, argument, xFunction, yFunction, zFunction } = this.params;
        render(
            <ul>
                <li>
                    <label for="tMin">tMin</label>
                    <ispace-number-scrubber name="tMin" value={tMin} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                </li>
                <li>
                    <label for="tMax">tMax</label>
                    <ispace-number-scrubber name="tMax" value={tMax} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                </li>
                <li>
                    <label for="argument">Argument name</label>
                    <input type="text" name="argument" value={argument} onChange={this.onChange} />
                </li>
                <li>
                    <label for="xFunction">xFunction</label>
                    <input type="text" name="xFunction" value={xFunction} onChange={this.onChange} />
                </li>
                <li>
                <label for="yFunction">yFunction</label>
                    <input type="text" name="yFunction" value={yFunction} onChange={this.onChange} />
                </li>
                <li>
                <label for="zFunction">zFunction</label>
                    <input type="text" name="zFunction" value={zFunction} onChange={this.onChange} />
                </li>
            </ul>, this);
    }
}
customElements.define('character-curve-dialog', CharacterCurveDialog);