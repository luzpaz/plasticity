import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import { Editor } from '../../Editor';
import * as THREE from "three";

// Time thresholds are in milliseconds, distance thresholds are in pixels.
const consummationTimeThreshold = 200; // once the mouse is down at least this long the drag is consummated
const consummationDistanceThreshold = 4; // once the mouse moves at least this distance the drag is consummated

export class ChangeEvent extends Event {
    constructor(type: string, readonly value: number) {
        super(type);
    }
}

export default (editor: Editor) => {
    type ScrubberState = { tag: 'none' } | { tag: 'down', downEvent: PointerEvent, startValue: number, disposable: Disposable } | { tag: 'dragging', downEvent: PointerEvent, startEvent: PointerEvent, startValue: number, currentValue: number, disposable: Disposable }

    class Scrubber extends HTMLElement {
        private state: ScrubberState = { tag: 'none' };

        constructor() {
            super();
            this.render = this.render.bind(this);
            this.onPointerDown = this.onPointerDown.bind(this);
            this.onPointerMove = this.onPointerMove.bind(this);
            this.onPointerUp = this.onPointerUp.bind(this);
        }

        connectedCallback() {
            this.render();
        }

        change(value: number) {
            this.setAttribute("value", String(value));
            this.render();
            const event = new ChangeEvent('change', value);
            this.dispatchEvent(event);
        }

        finish(e: PointerEvent) {
            const event = new Event('finish');
            this.dispatchEvent(event);
        }

        onPointerMove(e: PointerEvent) {
            switch (this.state.tag) {
                case 'down': {
                    const { downEvent, disposable, startValue } = this.state;
                    if (e.pointerId !== downEvent.pointerId) return;
                    const currentPosition = new THREE.Vector2(e.clientX, e.clientY);
                    const startPosition = new THREE.Vector2(e.clientX, e.clientY);
                    const dragStartTime = downEvent.timeStamp;
                    if (e.timeStamp - dragStartTime >= consummationTimeThreshold ||
                        currentPosition.distanceTo(startPosition) >= consummationDistanceThreshold
                    ) {
                        this.state = { tag: 'dragging', downEvent, disposable, startValue, startEvent: e, currentValue: startValue }
                    }

                    break;
                }
                case 'dragging':
                    const { downEvent, startEvent } = this.state;
                    if (e.pointerId !== downEvent.pointerId) return;

                    const delta = (e.clientX - startEvent.clientX) / 3;

                    // Speed up (10x) when Shift is held. Slow down (0.1x) when alt is held.
                    const precisionSpeedMod = e.shiftKey ? -1 : e.altKey ? 1 : 0;
                    const precisionDigits = 3; // FIXME
                    const precision = precisionDigits + precisionSpeedMod;

                    this.state.currentValue += delta * Math.pow(10, -precision);
                    const value = this.state.currentValue;
                    this.change(value);
                    this.state.startEvent = e;

                    break;
                default: throw new Error("invalid state");
            }
        }

        onPointerDown(e: PointerEvent) {
            switch (this.state.tag) {
                case 'none':
                    e.stopPropagation();
                    // preventDefault here prevents scrubber from focusing on start of drag
                    // (will focus later with the onCancel: onClick)
                    e.preventDefault();

                    const stringValue = this.getAttribute('value')!;
                    const startValue = +stringValue;

                    const disposables = new CompositeDisposable();

                    window.addEventListener('pointermove', this.onPointerMove);
                    window.addEventListener('pointerup', this.onPointerUp);
                    disposables.add(new Disposable(() => window.removeEventListener('pointermove', this.onPointerMove)));
                    disposables.add(new Disposable(() => window.removeEventListener('pointerup', this.onPointerUp)));

                    this.state = { tag: 'down', downEvent: e, disposable: disposables, startValue: startValue };
                    break;
                default: throw new Error("invalid state");
            }
        }

        onPointerUp(e: PointerEvent) {
            switch (this.state.tag) {
                case 'down': {
                    // this.oncancel();
                    const { downEvent, disposable } = this.state;
                    if (e.pointerId !== downEvent.pointerId) return;
                    disposable.dispose();
                    this.state = { tag: 'none' };
                    break;
                }
                case 'dragging':
                    const { downEvent, disposable } = this.state;
                    if (e.pointerId !== downEvent.pointerId) return;

                    this.finish(e);
                    disposable.dispose();
                    this.state = { tag: 'none' };
                    break;
                default: throw new Error("invalid state");
            }

        }

        render() {
            const stringValue = this.getAttribute('value')!;
            const startValue = +stringValue;
            const precisionDigits = 2;
            const displayValue = startValue.toFixed(precisionDigits);
            const decimalIndex = stringValue.lastIndexOf(".");
            const rawPrecisionDigits = decimalIndex >= 0 ? stringValue.length - decimalIndex - 1 : 0;

            render(
                <span class="number-scrubber" onPointerDown={this.onPointerDown}>
                    <span class="prefix"></span>
                    <span class="value">{displayValue}{precisionDigits < rawPrecisionDigits ? '...' : ''}</span>
                    <span class="suffix"></span>
                </span>, this);
        }
    }
    customElements.define('ispace-number-scrubber', Scrubber);
}