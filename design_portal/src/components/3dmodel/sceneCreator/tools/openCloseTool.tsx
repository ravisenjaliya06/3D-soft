import * as THREE from 'three';
import gsap from 'gsap';

export class CabinetMotionController {
    private ANIM_DURATION = 1;

    constructor() { }

    public toggleDoor(child: THREE.Mesh) {
        if (!child) return;
        const isClosed = child.userData.isClosed ?? true;

        const type = child.userData.openDirection;

        child.geometry.computeBoundingBox();
        const bbox = child.geometry.boundingBox;
        if (!bbox) {
            console.error('Bounding Box is Null');
            return;
        }

        let pivotOffsetX = 0;
        let pivotOffsetY = 0;

        switch (type) {
            case 'left':
                pivotOffsetX = bbox.min.x;
                pivotOffsetY = (bbox.max.y + bbox.min.y) / 2;
                break;
            case 'right':
                pivotOffsetX = bbox.max.x;
                pivotOffsetY = (bbox.max.y + bbox.min.y) / 2;
                break;
            case 'top':
                pivotOffsetX = (bbox.max.x + bbox.min.x) / 2;
                pivotOffsetY = bbox.max.y;
                break;
            case 'bottom':
                pivotOffsetX = (bbox.max.x + bbox.min.x) / 2;
                pivotOffsetY = bbox.min.y;
                break;
        }

        // child.geometry.translate(-pivotOffsetX, -pivotOffsetY, 0);
        console.log(pivotOffsetX, pivotOffsetY, 'pivotOffset');
        // child.position.x += pivotOffsetX;
        // child.position.y += pivotOffsetY;

        const targetRotation = { x: 0, y: 0, z: 0 };

        switch (type) {
            case 'left':
                targetRotation.y = isClosed ? -Math.PI / 2.5 : 0;
                break;
            case 'right':
                targetRotation.y = isClosed ? Math.PI / 2.5 : 0;
                break;
            case 'top':
                targetRotation.x = isClosed ? -Math.PI / 3 : 0;
                break;
            case 'bottom':
                targetRotation.x = isClosed ? Math.PI / 3 : 0;
                break;
        }

        gsap.to(child.rotation, {
            x: targetRotation.x,
            y: targetRotation.y,
            z: targetRotation.z,
            duration: this.ANIM_DURATION,
            ease: 'power2.inOut',
        });

        child.userData.isClosed = !isClosed;
    }

    public toggleDrawer(mesh: THREE.Mesh, openDistance = 0.25) {
        if (!mesh) return;

        const isClosed = mesh.userData.isClosed ?? true;

        if (!mesh.userData.closedPos) {
            mesh.userData.closedPos = mesh.position.clone();
        }

        const closedPos: THREE.Vector3 = mesh.userData.closedPos.clone();

        const openDir = new THREE.Vector3(0, 0, 1);

        const parent = mesh.parent as THREE.Object3D;
        if (parent) {
            const parentQuat = new THREE.Quaternion();
            parent.getWorldQuaternion(parentQuat);
            openDir.applyQuaternion(parentQuat).normalize();
        }

        const openPos = closedPos.clone().add(openDir.multiplyScalar(openDistance));
        const target = isClosed ? openPos : closedPos;

        gsap.to(mesh.position, {
            x: target.x,
            y: target.y,
            z: target.z,
            duration: this.ANIM_DURATION,
            ease: 'power2.inOut',
        });

        mesh.userData.isClosed = !isClosed;
    }
}
