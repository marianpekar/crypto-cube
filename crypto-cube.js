const FOV = 75;
const SCENE_BG_COLOR = new THREE.Color( 0xcacaca );
//const BITCUBE_COLOR = new THREE.Color( 0xfafafa );   
const ROTATION_SPEED = 0.0033;
const API_URL = "https://api.coindesk.com/v1/bpi/historical/close.json";

// Make everything smaller by the same factor, so from the PoV everything looks the same but actual sizes and distances are smaller.
// Reason: avoid cube jittering when camera is too far from the origin
const OVERALL_SCALE_FACTOR = 0.00005;

let scene, camera, cameraZPosition, renderer, cube, lastPrice = 0, price = 0, animationDone = false;

let width = window.innerWidth;
let height = window.innerHeight;
let windowHalf = new THREE.Vector2( width / 2, height / 2 );

let btcPrices = [], btcDates = [];

let clock = new THREE.Clock();
let animationSpeed;

function init() {
    let startDate = getQueryVariable( "start" );
    let endDate = getQueryVariable( "end" );
    animationSpeed = getQueryVariable( "speed" );
    
    if( !startDate )
        startDate = '2013-07-17'
    
    if( !endDate )
        endDate = getDateToday();

    if( !animationSpeed )
        animationSpeed = 30; // Default update is 30x per second = update every 33.333 milisecond.

    // If you want to go earlier, bear in mind the CoinDesk BPI only covers data from 2010-07-17 onwards.
    fetchData( startDate, endDate );
}

function initVisual() {
    setRenderer();
    setScene();
    setCamera();
    addLights();
    addBitCube();
    addEventListeners();
    startUpdatingValues();
    animate();
}

// Start and end dates must be in YYYY-MM-DD format
function fetchData( startDate, endDate ) {    
    const REQUEST_URL = `${ API_URL }?start=${ startDate }&end=${ endDate }`;
    
    fetch( REQUEST_URL )
        .then( response => {
            return response.json();
        }).then( data => {      
            Object.keys( data.bpi ).forEach( function( key ) {
                btcDates.push( key );
                btcPrices.push( data.bpi[ key ] );
            });

            initVisual();

        }).catch( error => {
            console.log(error);
        });
}

function getDateToday() {
    let date = new Date();
    return date.toISOString().split( 'T' )[ 0 ];
}

function getQueryVariable( variable )
{
       let query = window.location.search.substring( 1 );
       let vars = query.split( "&" );
       for (let i=0; i<vars.length; i++ ) {
               let pair = vars[ i ].split( "=" );
               if( pair[ 0 ] == variable ) { 
                   return pair[ 1 ]; 
                }
       }
       return( false );
}

function addEventListeners() {
    window.addEventListener( 'resize', onResize, false );
}

function onResize() {
    width = window.innerWidth;
    height = window.innerHeight;
    windowHalf.set( width / 2, height / 2 );

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize( width, height );
}

function setRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
}

function setScene() {
    scene = new THREE.Scene();         
    scene.background = SCENE_BG_COLOR;
}

function setCamera() {
    cameraZPosition = Math.max.apply(null, btcPrices);
    camera = new THREE.PerspectiveCamera( FOV, width/height, 0.001, 2 * cameraZPosition);
    // Camera position is 1 and a 1/2 units in meaning of 1 unit = maximal size of 'BitCube' = the biggest price in fetched data
    camera.position.z = (cameraZPosition + cameraZPosition / 2) * OVERALL_SCALE_FACTOR;
    camera.updateProjectionMatrix();
}

function addLights() {
    let light = new THREE.AmbientLight({ color: 0xffffff })
    scene.add( light );
}

function addBitCube() {
    let geometry = new THREE.BoxGeometry( 1, 1, 1 );
    let material = new THREE.MeshNormalMaterial();
    //let material = new THREE.MeshBasicMaterial( { color: BITCUBE_COLOR } );
    cube = new THREE.Mesh( geometry, material ); 
    scene.add( cube );
}

function updateText(i) {
    infoText = `1 BTC = USD ${ price.toFixed( 2 ) } \n ${ btcDates[ i ] }`;
    document.getElementById( "info-text" ).innerText = infoText;
}

function startUpdatingValues() {
    let i = 1;
    window.setInterval( function() {

        if( i >= btcPrices.length ) {
            animationDone = true;
            return;
        }

        price = btcPrices[ i ];
        lastPrice =  btcPrices[ i - 1 ];
        updateText( i );

        i++;
    }, 1000 * 1 / animationSpeed );
}

function scaleCube(targetSize, startSize) {
    let uniformT = clock.getElapsedTime() % 1.00;
    let t = ( uniformT * animationSpeed ) % 1.00;

    let scaler = THREE.Math.lerp( startSize, targetSize, t );
    scaler *= OVERALL_SCALE_FACTOR;

    scaler = Math.cbrt(scaler);

    cube.scale.set( scaler, scaler, scaler );
}

function rotateCube() {
    cube.rotateX( ROTATION_SPEED );
    cube.rotateY( ROTATION_SPEED );
    cube.rotateZ( ROTATION_SPEED );
}

function animate() {
    requestAnimationFrame( animate );

    rotateCube();

    if(!animationDone)
        scaleCube(price, lastPrice);

    renderer.render( scene, camera );
}

init();