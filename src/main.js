const gpxFiles = ['assets/path1.gpx', 'assets/path2.gpx'];

//main objects
var renderer, camera, scene;

//lights
var mainLight;
var ammbientLight;


//support objects
var controls;

//map
const tgeo = new ThreeGeo({
    tokenMapbox: 'pk.eyJ1Ijoib3JpbmljaGV2IiwiYSI6ImNrMHNqMDY2bjAyd28zb3FybnE5dDR1YWkifQ.32WNu1dwAHa5zn2bq2qRMQ',
    unitsSide: 5
});


//shapes and maps
var mapShapes = [], mapTextures = [];

var lightController = {
    color: 0xFFFFFF
    , x: -6.5
    , y: 5
    , z: 1
    , xTarget: 0
    , yTarget: 0
    , zTarget: 0
    , intencity: 1.0
}

var hemiLightController = {
    skyColor: 0xFFFFFF
    , terrainColor: 0xc7e3fc
    , intencity: 0.2
}

var mapController = {
    lat: 41.9802833
    , lon: 2.8011577
    , r: 50.0 //km
    , zoom: 11
    , zzoom: 10
    , showMap: false
    , rebuild: updateMap
    , mode: 'contour'
}

var mapStyleController = {
    shape: 'cube'
    , color: 0xFFFFFF
    , waterColor: 0x21adfa
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

    //load gpx
    gpxFiles.forEach(fileName => { loadGpx(fileName) });

    //light
    //directLight
    mainLight = new THREE.DirectionalLight();
    mainLight.castShadow = true;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.mapSize.width = 2000;
    mainLight.shadow.mapSize.height = 2000;
    mainLight.position.set(lightController.x, lightController.y, lightController.z);
    mainLight.target.position.set(lightController.xTarget, lightController.yTarget, lightController.zTarget);
    mainLight.color = new THREE.Color(lightController.color);
    mainLight.intensity = lightController.intencity;
    scene.add(mainLight.target);
    scene.add(mainLight);

    var shadowHelper = new THREE.CameraHelper(mainLight.shadow.camera);
    scene.add(shadowHelper);

    //hemisphere
    ammbientLight = new THREE.HemisphereLight();
    scene.add(ammbientLight);

    //helper
    var directLightHelper = new THREE.DirectionalLightHelper(mainLight);
    scene.add(directLightHelper);

    //normalize the direction vector (convert to vector of length 1)
    var axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    //camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 2);
    camera.lookAt(scene.position);

    //controls and helpers
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    gui = new dat.GUI();
    var mapSettings = gui.addFolder('map');
    mapSettings.add(mapController, 'lat').onChange();
    mapSettings.add(mapController, 'lon').onChange();
    mapSettings.add(mapController, 'r').onChange();
    mapSettings.add(mapController, 'zzoom').onChange();
    mapSettings.add(mapController, 'zoom').onChange();
    mapSettings.add(mapController, 'showMap').onChange();

    var mapShapes = gui.addFolder('shapes');
    mapShapes.addColor(mapStyleController, 'color').onChange();
    mapShapes.addColor(mapStyleController, 'waterColor').onChange();
    mapShapes.add(mapStyleController, 'r').onChange();
    mapShapes.add(mapStyleController, 'shape', ['cube', 'circle', 'hex', 'triangle']).onChange();
    mapShapes.add(mapStyleController, 'step').onChange();

    var lightSettings = gui.addFolder('light');
    lightSettings.addColor(lightController, 'color').onChange(updateLight);
    lightSettings.add(lightController, 'x', -100, 100).onChange(updateLight);
    lightSettings.add(lightController, 'y', -100, 100).onChange(updateLight);
    lightSettings.add(lightController, 'z', -100, 100).onChange(updateLight);
    lightSettings.add(lightController, 'xTarget', -100, 100).onChange(updateLight);
    lightSettings.add(lightController, 'yTarget', -100, 100).onChange(updateLight);
    lightSettings.add(lightController, 'zTarget', -100, 100).onChange(updateLight);
    lightSettings.add(lightController, 'intencity', 0, 1).onChange(updateLight);
    var ambientLightSettings = gui.addFolder('ambientLight');
    ambientLightSettings.addColor(hemiLightController, 'skyColor').onChange(updateLight);
    ambientLightSettings.addColor(hemiLightController, 'terrainColor').onChange(updateLight);
    ambientLightSettings.add(hemiLightController, 'intencity', 0, 1).onChange(updateLight);

    gui.add(mapController, 'mode', ['contour', 'shapes', 'meshes']).onChange(updateMap);
    gui.add(mapController, 'rebuild');
    updateLight();
    updateMap();

}

function loadGpx(filePath) {
    console.log('start loading gpx');
    var { proj, unitsPerMeter } = tgeo.getProjection([mapController.lat, mapController.lon], mapController.r)
    var request = new XMLHttpRequest();
    request.open("GET", filePath, true);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            if (request.status == 200 || request.status == 0) {
                console.log('done');
                var oParser = new DOMParser();
                var gpx = oParser.parseFromString(request.response, "application/xml");
                var tracks = gpx.getElementsByTagName('trk');
                var geometry = new THREE.Geometry();
                for (i = 0; i < tracks.length; i++) {
                    var points = tracks[i].getElementsByTagName('trkpt');

                    for (j = 0; j < points.length; j++) {
                        var point = points[j],
                            ele = parseInt(point.getElementsByTagName('ele')[0].firstChild.nodeValue),
                            lat = parseFloat(point.getAttribute('lat')),
                            lng = parseFloat(point.getAttribute('lon'));
                        var [x, y, z] = [...proj([lng, lat]), ele * unitsPerMeter];

                        geometry.vertices.push(new THREE.Vector3(x, y, z));
                    }
                }
                var material = new THREE.LineBasicMaterial({
                    color: 0xff0000,
                    linewidth: 200
                });

                var line = new THREE.Line(geometry, material);
                line.castShadow = true;
                scene.add(line);

            }
        }
    }
    request.send();
}

function updateLight() {
    //main lights   
    mainLight.position.set(lightController.x, lightController.y, lightController.z);
    mainLight.target.position.set(lightController.xTarget, lightController.yTarget, lightController.zTarget);
    mainLight.color = new THREE.Color(lightController.color);
    mainLight.intensity = lightController.intencity;
    //ambient
    ammbientLight.color = new THREE.Color(hemiLightController.skyColor);
    ammbientLight.groundColor = new THREE.Color(hemiLightController.terrainColor);
    ammbientLight.intencity = hemiLightController.intencity;

}

function updateMap() {
    console.log('update map start');
    //remove old
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
    console.log(mapController.mode);
    switch (mapController.mode) {
        case 'contour':
            rebuildLayerMap();
            break;
        case 'shapes':
            rebuildMap();
            break;
        case 'meshed':
            rebuildMeshedMap();
            break;
    }
}

function rebuildMap() {
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
                    if (mapStyleController.step <= 10) {
                        mapElement.castShadow = false;
                        mapElement.receiveShadow = false;
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

function rebuildLayerMap() {
    tgeo.getTerrain([mapController.lat, mapController.lon], mapController.r, 12, {
        onVectorDem: (objs) => {
            console.log(objs);
            objs.forEach((obj) => {
                if (obj.name.includes('shade')) {
                    obj.material = new THREE.MeshPhongMaterial({ color: mapStyleController.color });
                    if (obj.position.z < 0) { obj.material = new THREE.MeshPhongMaterial({ color: mapStyleController.waterColor }); }
                    obj.castShadow = true;
                    obj.receiveShadow = true;

                        scene.add(obj);
                        mapShapes.push(obj);
                    
                }
                console.log('done');

            })
        }
    });
}

//other algoritm implementation
function rebuildMeshedMap() {
    tgeo.getTerrain([mapController.lat, mapController.lon], mapController.r, 10, {
        onRgbDem: (meshes) => { // your implementation when terrain's geometry is obtained
            meshes.forEach((mesh) => {
                var material = new THREE.MeshPhongMaterial({ color: mapStyleController.color });
                var geometry = mesh.geometry;
                scene.add(new THREE.Mesh(geometry, material));
                if (mapController.showMap) {
                    scene.add(mesh);
                    mapTextures.push(mesh);
                };
            });
        }
    });
}

const createPanelSprite = (can, pixelsPerUnit = 512) => {
    const mat = new THREE.SpriteMaterial({
        map: new THREE.Texture(can),
        opacity: 0.7,
        color: 0xffffff,
    });
    mat.map.needsUpdate = true;
    const sp = new THREE.Sprite(mat);
    sp.scale.set(
        can.width / pixelsPerUnit, can.height / pixelsPerUnit, 1.0);
    return sp;
};

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




