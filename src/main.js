
//main objects
var renderer, camera, scene;

var spotLight1 = createSpotlight(0x6AE2F7, -50, 150, 0, Math.PI / 3);
var spotLight2 = createSpotlight(0xF90387, -50, -390, 0, -Math.PI / 3);
var spotLight3 = createSpotlight(0x6AE2F7, 50, 150, 0, Math.PI / 3);
var spotLight4 = createSpotlight(0xF90387, 50, -390, 0, -Math.PI / 3);
var light1, light2;

//support objects
var controls;

//map
const tgeo = new ThreeGeo({
    tokenMapbox: 'pk.eyJ1Ijoib3JpbmljaGV2IiwiYSI6ImNrMHNqMDY2bjAyd28zb3FybnE5dDR1YWkifQ.32WNu1dwAHa5zn2bq2qRMQ',
});


//shapes and maps
var mapShapes = [], mapTextures = [];

var mapController = {
    lat: 41.9802833
    , lon: 2.8011577
    , r: 50.0 //km
    , zzoom: 10
    , showMap: false
    , rebuild: rebuildMap
}

var mapStyleController = {
    shape: 'cube'
    , color: 0xFFFFFF
    , r: 0.008
    , step: 60
}

init();
animate();

function init() {
    // Renderer
    //if (!Detector.webgl) Detector.addGetWebGLMessage();
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    // Scene

    scene = new THREE.Scene();

    //light
    //scene.add(spotLight1, spotLight2);//, spotLight3, spotLight4);

    scene.add(new THREE.AmbientLight(0xFFFFFF, 0.8));

    var light = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 5, 0.3);
    light.position.set(-2, 2, 1);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 100;
    light.shadow.bias = 0.0001;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    scene.add(light);

    //axes
    var dir = new THREE.Vector3(1, 2, 0);

    //normalize the direction vector (convert to vector of length 1)
    var axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    //light helper
    var spotLightHelper = new THREE.SpotLightHelper(light);
    scene.add(spotLightHelper);




    light2 = new THREE.DirectionalLight(0xFFFFFF);
    light2.castShadow = true;
    light2.position.set(0, -140, 0);
    //scene.add(light2);

    //camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 2);
    camera.lookAt(scene.position);

    //controls and helpers
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    var gridHelper = new THREE.GridHelper(2000, 20000);
    scene.add(gridHelper);

    gui = new dat.GUI();    
    var mapSettings = gui.addFolder('map');
    mapSettings.add(mapController, 'lat').onChange();
    mapSettings.add(mapController, 'lon').onChange();
    mapSettings.add(mapController, 'r').onChange();
    mapSettings.add(mapController, 'zzoom').onChange();
    mapSettings.add(mapController, 'showMap').onChange();
    var mapShapes = gui.addFolder('shapes');
    mapShapes.addColor(mapStyleController, 'color').onChange();
    mapShapes.add(mapStyleController, 'r').onChange();
    mapShapes.add(mapStyleController, 'shape', ['cube', 'circle', 'hex', 'triangle']).onChange();
    mapShapes.add(mapStyleController, 'step').onChange();

    gui.add(mapController, 'rebuild');


    rebuildMap();
}

function createSpotlight(color, x, y, z, angle) {
    var newObj = new THREE.DirectionalLight(color, 2);
    newObj.castShadow = false;
    newObj.position.y = y;
    newObj.angle = angle;
    newObj.penumbra = 0;
    newObj.intencity = 2;
    newObj.decay = 2;
    newObj.distance = 500;
    newObj.shadow.mapSize.width = 1024;
    newObj.shadow.mapSize.height = 1024;
    return newObj;
}

function rebuildMap() {
    mapShapes.forEach((shape) => {
        if (shape.geometry) shape.geometry.dispose();
        if (shape.texture) shape.texture.dispose();
        scene.remove(shape);
    });
    mapShapes = [];
    mapTextures.forEach((shape) => {
        if (shape.geometry) shape.geometry.dispose();
        if (shape.texture) shape.texture.dispose();
        scene.remove(shape);
    });
    mapTextures = [];
    tgeo.getTerrain([mapController.lat, mapController.lon], mapController.r, 10, {
        onRgbDem: (meshes) => { // your implementation when terrain's geometry is obtained
            meshes.forEach((mesh) => {
                const array = mesh.geometry.attributes.position.array;
                for (var i = 0; i < array.length; i += 3 * mapStyleController.step) {
                    if (array[i + 2] == 0) continue; //remove water
                    var heightZoomed = array[i + 2] * mapController.zzoom;
                    var mapElement;
                    if (mapStyleController.shape == 'cube') {
                        mapElement = makeCube(array[i], array[i + 1], heightZoomed);
                    } else if (mapStyleController.shape == 'circle') {
                        mapElement = makeCilinder(array[i], array[i + 1], heightZoomed, 32);
                    } else if (mapStyleController.shape == 'hex') {
                        mapElement = makeCilinder(array[i], array[i + 1], heightZoomed, 6);
                    } else if (mapStyleController.shape == 'triangle') {
                        mapElement = makeCilinder(array[i], array[i + 1], heightZoomed, 3);
                    }
                    scene.add(mapElement);
                    mapShapes.push(mapElement);
                }
                if (mapController.showMap) {
                    scene.add(mesh);
                    mapTextures.push(mesh);
                };
            });
        }
    });
}

function makeCube(x, y, d) {
    var cube;
    var geometry = new THREE.BoxBufferGeometry(mapStyleController.r * 2, mapStyleController.r * 2, d);
    var material = new THREE.MeshPhongMaterial({ color: mapStyleController.color });
    cube = new THREE.Mesh(geometry, material);
    cube.receiveShadow = true;
    cube.castShadow = true;
    cube.position.set(x, y, d / 2);
    return cube;
}

function makeCilinder(x, y, d, edges) {
    var cylinder;
    var geometry = new THREE.CylinderGeometry(mapStyleController.r * 2, mapStyleController.r * 2, d, edges);
    var material = new THREE.MeshPhongMaterial({ color: mapStyleController.color });
    cylinder = new THREE.Mesh(geometry, material);
    cylinder.receiveShadow = true;
    cylinder.castShadow = true;
    cylinder.position.set(x, y, d / 2);
    cylinder.rotateX(Math.PI / 2);
    return cylinder;
}

function animate() {
    requestAnimationFrame(animate);

    renderer.render(scene, camera);
}




