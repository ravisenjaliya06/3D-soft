import { GEOMETRY, InitialDataForCreateMesh, MATERIAL_TYPE } from "./interface";
import * as THREE from 'three';

export class DesignBuilder {

    private data: InitialDataForCreateMesh[];
    private meshData!: InitialDataForCreateMesh;

    constructor(data: InitialDataForCreateMesh[]) {
        this.data = data;
    }

    public getTexture(): THREE.Texture {
        return new THREE.TextureLoader().load(
            this.meshData.material.value
        );
    }

    public getColorMaterial(): THREE.MeshBasicMaterial {
        return new THREE.MeshBasicMaterial(
            {
                color: this.meshData.material.value,
                wireframe: true
            }
        );
    }

    public getTextureMaterial(): THREE.MeshStandardMaterial {
        const texture = this.getTexture();
        return new THREE.MeshStandardMaterial(
            {
                map: texture
            }
        );
    }

    public getMaterial() {
        switch (this.meshData.material.type) {
            case MATERIAL_TYPE.COLOR:
                return this.getColorMaterial();
            case MATERIAL_TYPE.TEXTURE:
                return this.getTextureMaterial();
        }
    }

    public getBoxGeometry(): THREE.BoxGeometry {
        return new THREE.BoxGeometry(
            this.meshData.width,
            this.meshData.height,
            this.meshData.depth
        );
    }

    public getGeometry() {
        switch (this.meshData.geometryType) {
            case GEOMETRY.BOX_GEOMETRY:
                return this.getBoxGeometry();
        }
    }

    public getMesh(): THREE.Mesh {
        const geometry = this.getGeometry();
        const material = this.getMaterial();

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = this.meshData.name;
        return mesh;
    }

    public getGroup(): THREE.Group {
        const group = new THREE.Group();
        return group;
    }

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
