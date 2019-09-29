
//main objects
var renderer, camera, scene;

//support objects
var controls;

const tgeo = new ThreeGeo({
    tokenMapbox: 'pk.eyJ1Ijoib3JpbmljaGV2IiwiYSI6ImNrMHNqMDY2bjAyd28zb3FybnE5dDR1YWkifQ.32WNu1dwAHa5zn2bq2qRMQ',
});

var mapController = {
    lat: 41.9802833
    , lon: 2.8011577
    , r: 50.0 //km
}

var mapStyleController = {
    shape: 'cube'
    , color: 0xFFFFFF
    , r: 0.001
    , step: 10
}

init();
animate();

function init() {
    // Renderer
    //if (!Detector.webgl) Detector.addGetWebGLMessage();
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    // Scene

    scene = new THREE.Scene();

    //camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 2);
    camera.lookAt(scene.position);

    //controls and helpers
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    var gridHelper = new THREE.GridHelper(2000, 20000);
    scene.add(gridHelper);



    tgeo.getTerrain([mapController.lat, mapController.lon], mapController.r, 10, {
        onRgbDem: (meshes) => { // your implementation when terrain's geometry is obtained
            meshes.forEach((mesh) => {
                const array = mesh.geometry.attributes.position.array;
                for (var i = 0; i < array.length; i += 3*mapStyleController.step) {
                    var geometry = new THREE.BoxBufferGeometry(mapStyleController.r*2, mapStyleController.r*2, array[i + 2]);
                    var material = new THREE.MeshBasicMaterial({ color: mapStyleController.color });
                    var cube = new THREE.Mesh(geometry, material);
                    cube.position.set(array[i], array[i + 1], array[i + 2] / 2);
                    scene.add(cube);
                }
                if (mapController.showMAP) {scene.add(mesh)};
            });
        }
    });
}

function animate() {
    requestAnimationFrame(animate);

    renderer.render(scene, camera);
}




