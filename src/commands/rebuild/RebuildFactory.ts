import c3d from '../../../build/Release/c3d.node';
import { TemporaryObject } from '../../GeometryDatabase';
import * as visual from '../../VisualModel';
import { GeometryFactory } from '../Factory';

export class RebuildFactory extends GeometryFactory {
    dup!: c3d.Item;
    item!: visual.Item;

    private temp?: TemporaryObject;

    async doUpdate() {
        const { dup, item } = this;

        dup.RebuildItem(c3d.CopyMode.Copy, null);

        const temp = await this.db.addTemporaryItem(dup);

        item.visible = false;
        this.temp?.cancel();
        this.temp = temp;
    }

    async doCommit() {
        const { dup } = this;

        dup.RebuildItem(c3d.CopyMode.Copy, null);

        const result = await this.db.addItem(dup);
        this.db.removeItem(this.item);
        this.temp?.cancel();
        return result;
    }

    doCancel() {
        this.temp?.cancel();
    }
}