import { GEOMETRY, InitialDataForCreateMesh, MATERIAL_TYPE } from "./interface";
import * as THREE from 'three';

export class DesignBuilder {

    private data: InitialDataForCreateMesh[];
    private meshData!: InitialDataForCreateMesh;

    constructor(data: InitialDataForCreateMesh[]) {
        this.data = data;
    }

    /* create mesh texture loader */
    public getTexture(): THREE.Texture {
        return new THREE.TextureLoader().load(
            this.meshData.material.value
        );
    }

    /*  create color material */
    public getColorMaterial(): THREE.MeshBasicMaterial {
        return new THREE.MeshBasicMaterial(
            {
                color: this.meshData.material.value,
                wireframe: true
            }
        );
    }

    /* create mesh material */
    public getTextureMaterial(): THREE.MeshStandardMaterial {
        const texture = this.getTexture();
        return new THREE.MeshStandardMaterial(
            {
                map: texture
            }
        );
    }

    /* fetch mesh material type from data */
    public getMaterial() {
        switch (this.meshData.material.type) {
            case MATERIAL_TYPE.COLOR:
                return this.getColorMaterial();
            case MATERIAL_TYPE.TEXTURE:
                return this.getTextureMaterial();
        }
    }

    /*  create box geometry for mesh */
    public getBoxGeometry(): THREE.BoxGeometry {
        return new THREE.BoxGeometry(
            this.meshData.width,
            this.meshData.height,
            this.meshData.depth
        );
    }

    /* fetch geometry type from data */
    public getGeometry() {
        switch (this.meshData.geometryType) {
            case GEOMETRY.BOX_GEOMETRY:
                return this.getBoxGeometry();
        }
    }

    /* set position of mesh */
    public setPosition(mesh: THREE.Mesh) {
        mesh.position.set(
            this.meshData.position.x,
            this.meshData.position.y,
            this.meshData.position.z
        );
    }

    /* create mesh object*/
    public getMesh(): THREE.Mesh {
        const geometry = this.getGeometry();
        const material = this.getMaterial();

        const mesh = new THREE.Mesh(geometry, material);

        // set position of mesh
        this.setPosition(mesh);
        mesh.name = this.meshData.name;
        return mesh;
    }

    /* create blank group */
    public getGroup(): THREE.Group {
        const group = new THREE.Group();
        return group;
    }

    /* create mesh and add in group */
    public getDesign(): THREE.Group {
        const group = this.getGroup();

        this.data.forEach((meshData) => {
            this.meshData = meshData;
            const mesh = this.getMesh();
            group.add(mesh);
        });

        return group;
    }
}
