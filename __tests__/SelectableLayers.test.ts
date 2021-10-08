import * as THREE from "three";
import { CornerBoxFactory, ThreePointBoxFactory } from "../src/commands/box/BoxFactory";
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import LineFactory from "../src/commands/line/LineFactory";
import { RegionFactory } from "../src/commands/region/RegionFactory";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { EditorSignals } from "../src/editor/EditorSignals";
import { GeometryDatabase } from "../src/editor/GeometryDatabase";
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { filter, select, SelectableLayers } from "../src/editor/SelectableLayers";
import * as visual from "../src/editor/VisualModel";
import { HighlightManager } from "../src/selection/HighlightManager";
import { SelectionManager } from "../src/selection/SelectionManager";
import { BetterSelectionBox } from "../src/util/BetterRaycastingPoints";
import { FakeMaterials } from "../__mocks__/FakeMaterials";

let materials: MaterialDatabase;
let makeSphere: SphereFactory;
let makeLine: LineFactory;
let makeCircle: CenterCircleFactory;
let makeBox: ThreePointBoxFactory;
let db: GeometryDatabase;
let signals: EditorSignals;
let makeRegion: RegionFactory;
let highlighter: HighlightManager;
let selection: SelectionManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    makeSphere = new SphereFactory(db, materials, signals);
    makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeLine = new LineFactory(db, materials, signals);
    makeCircle = new CenterCircleFactory(db, materials, signals);
    makeRegion = new RegionFactory(db, materials, signals);
    selection = new SelectionManager(db, materials, signals);
    highlighter = new HighlightManager(db, materials, selection, signals);
});

test('raycast simple solid', async () => {
    makeSphere.center = new THREE.Vector3();
    makeSphere.radius = 1;
    const item = await makeSphere.commit() as visual.Solid;
    item.updateMatrixWorld();

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 2);
    camera.lookAt(0, 0, 0);

    item.lod.update(camera);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Mesh.threshold = 0;
    raycaster.layers = SelectableLayers;
    const pointer = { x: 0, y: 0 };
    raycaster.setFromCamera(pointer, camera);

    let intersections = raycaster.intersectObject(item, true);
    intersections = filter(intersections);

    expect(intersections.length).toBe(1);
    expect(intersections[0].object).toBeInstanceOf(visual.Face);
});

test('raycast SpaceInstance<Curve3D>', async () => {
    makeLine.p1 = new THREE.Vector3();
    makeLine.p2 = new THREE.Vector3(5, 5, 5);
    const item = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
    item.updateMatrixWorld();
    highlighter.highlight();

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    item.lod.update(camera);

    const raycaster = new THREE.Raycaster();
    raycaster.layers = SelectableLayers;
    const pointer = { x: 0, y: 0 };
    raycaster.setFromCamera(pointer, camera);

    raycaster.layers.disable(visual.Layers.ControlPoint);
    let intersections = raycaster.intersectObject(item, true);
    intersections = filter(intersections);
    expect(intersections.length).toBe(1);
    expect(intersections[0].object).toBeInstanceOf(visual.Curve3D);

    raycaster.layers.enable(visual.Layers.ControlPoint);
    intersections = raycaster.intersectObject(item, true);
    intersections = filter(intersections);
    expect(intersections.length).toBe(2);
    expect(intersections[0].object).toBeInstanceOf(visual.Curve3D);
    expect(intersections[1].object).toBeInstanceOf(visual.ControlPoint);
});

test('raycast PlaneInstance<Region>', async () => {
    makeCircle.center = new THREE.Vector3();
    makeCircle.radius = 1;
    const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

    makeRegion.contours = [circle];
    const regions = await makeRegion.commit() as visual.PlaneInstance<visual.Region>[];
    const region = regions[0];

    region.updateMatrixWorld();

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    region.lod.update(camera);

    const raycaster = new THREE.Raycaster();
    raycaster.layers = SelectableLayers;
    const pointer = { x: 0, y: 0 };
    raycaster.setFromCamera(pointer, camera);

    let intersections = raycaster.intersectObject(region, true);
    intersections = filter(intersections);
    expect(intersections.length).toBe(1);
    expect(intersections[0].object).toBeInstanceOf(visual.Region);
});

test('box select SpaceInstance<Curve3D>', async () => {
    makeLine.p1 = new THREE.Vector3();
    makeLine.p2 = new THREE.Vector3(2, 2, 0);
    const item = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
    highlighter.highlight();

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    item.lod.update(camera);

    db.rebuildScene();
    const box = new BetterSelectionBox(camera, db.scene);
    box.startPoint.set(-1, -1, 0.5);
    box.endPoint.set(1, 1, 0.5);

    SelectableLayers.enable(visual.Layers.ControlPoint);
    SelectableLayers.disable(visual.Layers.Curve);
    const selected = box.select();
    const filtered = [...select(selected)];

    expect(filtered.length).toBe(2);
    expect(filtered[0]).toBeInstanceOf(visual.ControlPoint);
    expect(filtered[1]).toBeInstanceOf(visual.ControlPoint);
});

test('xray on off', async () => {
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const item = await makeBox.commit() as visual.Solid;
    const edge = item.edges.get(0);
    const { line, occludedLine } = edge;
    const face = item.faces.get(0);
    const mesh = face.child;
    const intersections = [
        {
            object: mesh,
            distance: 1,
            point: new THREE.Vector3(),
        },
        {
            object: line,
            distance: 2,
            point: new THREE.Vector3(),
        },
        {
            object: occludedLine,
            distance: 2,
            point: new THREE.Vector3(),
        },

    ] as THREE.Intersection[];

    let filtered;
    SelectableLayers.enable(visual.Layers.XRay);
    SelectableLayers.enable(visual.Layers.Face);
    SelectableLayers.enable(visual.Layers.CurveEdge);
    filtered = filter(intersections);
    expect(filtered.length).toBe(2);
    expect(filtered[0].object).toBe(edge);

    SelectableLayers.disable(visual.Layers.XRay);
    filtered = filter(intersections);
    expect(filtered.length).toBe(2);
    expect(filtered[0].object).toBe(face);
})