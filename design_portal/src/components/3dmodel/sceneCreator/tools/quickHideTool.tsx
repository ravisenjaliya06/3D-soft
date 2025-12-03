import * as THREE from "three";
import { OBJECT_TYPES, PART_TYPES } from "../interface";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { store } from "../../store";

export class OutlineManager {
    private scene: THREE.Scene;
    private isQuickHideActive = false;

    private originalMaterialsRef = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    private childOutlineGroupsRef = new Map<THREE.Mesh, THREE.Group>();

    private hiddenMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    constructor() {
        const state = store.getState().scene?.scene;
        if (!state) {
            console.warn("Scene not ready yet for OutlineManager");
        }
        this.scene = state;
    }

    public setQuickHide(state: boolean) {
        this.isQuickHideActive = state;
    }

    public toggle() {
        if (!this.scene) {
            console.error("OutlineManager: Scene is undefined. Toggle aborted.");
            return;
        }
        console.log(this.scene, 'this.isQuickHideActive');
        this.scene.children.forEach((object) => {
            if (object instanceof THREE.Mesh) {
                if (this._shouldSkipMesh(object)) return;
                const applyOutline = object.userData.isMain === true;

                if (this.isQuickHideActive) {
                    this._applyQuickHide(object, applyOutline);
                } else {
                    this._restoreMesh();
                }
            }
        });
    }

    private _shouldSkipMesh(mesh: THREE.Mesh) {
        return (
            mesh.name === "grid" ||
            mesh.name === "floor" ||
            mesh.name === "daysky" ||
            mesh.name === "nightsky" ||
            mesh instanceof THREE.GridHelper
        );
    }

    private _applyQuickHide(mesh: THREE.Mesh, applyOutline: boolean) {
        if (!this.originalMaterialsRef.has(mesh)) {
            this.originalMaterialsRef.set(mesh, mesh.material);
        }

        mesh.material = this.hiddenMaterial;
        this._markNeedsUpdate(mesh.material);

        if (applyOutline) {
            this._generateOutline(mesh);
        }
    }

    private _markNeedsUpdate(mat: THREE.Material | THREE.Material[]) {
        if (Array.isArray(mat)) mat.forEach((m) => (m.needsUpdate = true));
        else mat.needsUpdate = true;
    }

    private _generateOutline(mainMesh: THREE.Mesh) {
        if (!mainMesh.userData.isMain) return;

        const outlineGroup = new THREE.Group();
        outlineGroup.name = `outline_group_${mainMesh.uuid}`;
        outlineGroup.position.copy(mainMesh.position);
        outlineGroup.rotation.copy(mainMesh.rotation);
        outlineGroup.scale.copy(mainMesh.scale);

        const mergedGeometries: THREE.BufferGeometry[] = [];

        mainMesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry && (!child.userData.isInvisibleBox)) {
                // Clone geometry and apply child's world matrix
                const clonedGeo = child.geometry.clone();
                clonedGeo.applyMatrix4(child.matrixWorld);
                clonedGeo.applyMatrix4(mainMesh.matrixWorld.clone().invert());
                mergedGeometries.push(clonedGeo);
            }
        });

        if (mergedGeometries.length === 0) return;

        const finalGeo = BufferGeometryUtils.mergeGeometries(
            mergedGeometries,
            false
        );
        
        const edges = new THREE.EdgesGeometry(finalGeo, 1);

        const outlineMat = new THREE.LineBasicMaterial({
            color: 0x392579,
            depthTest: false,
        });

        const outline = new THREE.LineSegments(edges, outlineMat);
        outline.renderOrder = 2;

        outlineGroup.add(outline);

        this.scene.add(outlineGroup);
        this.childOutlineGroupsRef.set(mainMesh, outlineGroup);
    }

    private _restoreMesh() {
        this.originalMaterialsRef.forEach((originalMat, mesh) => {
            mesh.material = originalMat;
            this._markNeedsUpdate(mesh.material);
        });

        this.scene.children.forEach((object) => {
            if (object instanceof THREE.Group && object.name.includes('outline_group')) {
                this.scene.remove(object);
            }
        });
    }
}
