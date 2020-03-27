class IndexPage {

    swimUrl = null;
    rootHtmlElementId = null;
    rootSwimTemplateId = null;
    rootHtmlElement = null;
    rootSwimElement = null;
    canvas = null;
    context = null;
    overlay = null;
    map = null;
    aggregateNodeRef = null;
    selectedMapPoint = null;
    appConfig = null;
    userGuid = null;
    mapBoundingBox = null;
    links = {};
    didMapMove = false;
    fastTween = swim.Transition.duration(100);
    currentZoomLevel = 0;

    stateMapMarkers = {};
    stateLocationList = {};
    testScoresByStateData = {};
    testingLocationsList = {};
    selectedDataLayer = 'positive';

    constructor(swimUrl, elementID, templateID) {
        // console.info("[IndexPage]: constructor");
        this.swimUrl = swimUrl;
        this.rootHtmlElementId = elementID;
        this.rootSwimTemplateId = templateID;

        // console.info("[IndexPage]: cookie", document.cookie, Utils.getCookie("swim.user.guid"))
        if(Utils.getCookie("swim.user.guid") === "") {
            this.userGuid = Utils.newGuid();
            Utils.setCookie("swiw.user.guid", this.userGuid, 30);
            // console.info("[IndexPage]: new user guid set", this.userGuid);
        } else {
            this.userGuid = Utils.getCookie("swim.user.guid");
            // console.info("[IndexPage]: user has guid cookie", this.userGuid);
        }
        // this.airplaneWorker = new Worker('/assets/js/airplaneWorker.js');
    }

    initialize() {
        console.info("[IndexPage]: init", this.userGuid);
        swim.command(this.swimUrl, "/userPrefs/" + this.userGuid, "setGuid", this.userGuid);
        this.rootHtmlElement = document.getElementById(this.rootHtmlElementId);
        this.rootSwimElement = swim.HtmlView.fromNode(this.rootHtmlElement);
        this.loadTemplate(this.rootSwimTemplateId, this.rootSwimElement, this.start.bind(this), false);
        this.aggregateNodeRef = swim.nodeRef(this.swimUrl, 'aggregation');
        this.links["stateLocationsLink"] = this.aggregateNodeRef.downlinkMap().laneUri('stateLocations')
            .didUpdate((key, newValue) => {
                const stateId = newValue.get("id").stringValue();
                this.stateLocationList[stateId] = newValue;
            })
            .didSync(() => {
                this.links["stateLocationsLink"].close();
                this.populateStatesDropdown();
            });

        this.links["stateTestScores"] = this.aggregateNodeRef.downlinkMap().laneUri('stateTestScores')
            .didUpdate((key, newValue) => {
                const stateId = newValue.get("id").stringValue();
                this.testScoresByStateData[stateId] = newValue;
            })
            .didSync(() => {
                this.links["stateTestScores"].close();
                this.drawCountsByState();
            });

        this.links["testingLocations"] = this.aggregateNodeRef.downlinkMap().laneUri('testingLocations')
            .didUpdate((key, newValue) => {
                // const stateId = newValue.get("id").stringValue();
                this.testingLocationsList[key] = newValue;
            })
            .didSync(() => {
                this.links["testingLocations"].close();
                // this.drawCountsByState();
            });
    }

    start() {
        console.info("[IndexPage]: start");
        swim.command(this.swimUrl, "/userPrefs/" + this.userGuid, "setGuid", this.userGuid);
        this.map = this.rootSwimElement.getCachedElement("e55efe2c");

        document.getElementById("statesDropDown").onchange = (evt) => {
            this.selectState(evt.target.value);
        }

        document.getElementById("dataLayerDropDown").onchange = (evt) => {
            this.selectDataLayer(evt.target.value);
        }

        this.overlay = this.map.overlays['121246ec'];

        this.map.map.dataDirty = true;
        this.map.map.synced = false;

        this.map.map.on("load", () => {
            this.currentZoomLevel = this.map.map.getZoom();
            // this.drawOnGroundPie();
            // this.drawAltitudePie();
            this.updateMapBoundingBox();
            for(let linkLKey in this.links) {
                this.links[linkLKey].open();
            }

        });

        const handleMapUpdate = () => {
            this.didMapMove = true;
            this.currentZoomLevel = this.map.map.getZoom();
        }

        // this.map.map.dragRotate.disable();
        // this.map.map.touchZoomRotate.disable();

        this.map.map.on("zoom", handleMapUpdate);
        this.map.map.on("zoomend", handleMapUpdate);

        this.map.map.on("move", handleMapUpdate);
        this.map.map.on("moveend", handleMapUpdate);

        this.statePopoverView = new swim.PopoverView()
            .borderRadius(10)
            .padding(0)
            .arrowHeight(20)
            .arrowWidth(20)
            .backgroundColor(swim.Color.parse("#071013").alpha(0.7))
            .backdropFilter("blur(2px)");
            
        this.statePopoverContent = swim.HtmlView.create("div");
        this.statePopoverContent.render("c4e75561");
        this.statePopoverView.append(this.statePopoverContent);
        this.rootSwimElement.append(this.statePopoverView);        

        this.testingLocationPopoverView = new swim.PopoverView()
            .borderRadius(10)
            .padding(0)
            .arrowHeight(20)
            .arrowWidth(20)
            .backgroundColor(swim.Color.parse("#071013").alpha(0.7))
            .backdropFilter("blur(2px)");
            
        this.testingLocationPopoverContent = swim.HtmlView.create("div");
        this.testingLocationPopoverContent.render("e2a9b991");
        this.testingLocationPopoverView.append(this.testingLocationPopoverContent);
        this.rootSwimElement.append(this.testingLocationPopoverView);        

        window.requestAnimationFrame(() => {
            this.render();
        });

        document.body.onresize = () => {
            this.handleResize();
        };

    }

    render() {


        

        window.requestAnimationFrame(() => {
            this.render();
        })
    }

    populateStatesDropdown() {
        const dropdown = document.getElementById("statesDropDown");

        for(let key in this.stateLocationList) {
            const stateInfo = this.stateLocationList[key];
            const newOption = document.createElement("option");
            newOption.value = stateInfo.get("id").stringValue();
            newOption.innerHTML = stateInfo.get("name").stringValue();
            console.info();
            dropdown.appendChild(newOption);

        }
    }

    updateMapBoundingBox() {
        const topLeftPoint = new mapboxgl.Point(0, 0);
        const bottomRightPoint = new mapboxgl.Point(document.body.offsetWidth, document.body.offsetHeight)
        const topLeftCoords = this.map.map.unproject(topLeftPoint);
        const bottomRightCoords = this.map.map.unproject(bottomRightPoint);

        this.mapBoundingBox = [topLeftCoords, bottomRightCoords];
        
    }

    renderStatePopover(key) {

        const stateData = this.stateLocationList[key];
        const stateCount = this.testScoresByStateData[key];
        const newMarker = this.stateMapMarkers[key];
        // console.info("airport clicked:" + airportData);

        this.statePopoverView.hidePopover(this.fastTween);
        this.statePopoverView.setSource(newMarker);            
        this.statePopoverView.showPopover(this.fastTween);   
        
        this.statePopoverContent.getCachedElement("31642d81").text(stateData.get("name").stringValue());
        this.statePopoverContent.getCachedElement("e29f472a").text(stateCount.get("positive").stringValue());
        this.statePopoverContent.getCachedElement("ff42bb72").text(stateCount.get("negative").stringValue());
        this.statePopoverContent.getCachedElement("01d5a4da").text(stateCount.get("total").stringValue());


    }

    renderTestingLocationPopover(key) {
        this.hideStatePopover();
        const locationData = this.testingLocationsList[key];
        const newMarker = this.stateMapMarkers[key];
        // console.info("airport clicked:" + airportData);

        this.testingLocationPopoverView.hidePopover(this.fastTween);
        this.testingLocationPopoverView.setSource(newMarker);            
        this.testingLocationPopoverView.showPopover(this.fastTween);   
        
        this.testingLocationPopoverContent.getCachedElement("31642d18").text(locationData.get("location_name").stringValue());
        this.testingLocationPopoverContent.getCachedElement("e29f4700").text(locationData.get("location_address_street").stringValue());
        this.testingLocationPopoverContent.getCachedElement("ff42bb00").text(locationData.get("location_address_locality").stringValue());
        this.testingLocationPopoverContent.getCachedElement("01d5a400").text(locationData.get("location_contact_phone_main").stringValue());
        this.testingLocationPopoverContent.getCachedElement("0c29c45f").text(locationData.get("is_verified").stringValue());

        
    }

    drawCountsByState() {
        console.info("draw state numbers");
        console.info(this.testScoresByStateData);
        this.clearMapMarkers()
        for(let key in this.testScoresByStateData) { 
            const currCounts = this.testScoresByStateData[key]; 
            // const currCountry = this.countriesList[key];
            if(currCounts) {
                // if(!this.countryMarkers[key]) {
                    let tempMarker = new swim.MapCircleView()
                        // .center([newLat, newLng])
                        .center(mapboxgl.LngLat.convert([currCounts.get("longitude"), currCounts.get("latitude")]))
                        .radius(20)
                        .fill(swim.Color.rgb(155, 155, 155, 0.75))
                        .stroke(swim.Color.rgb(100, 100, 255, 1))
                        .strokeWidth(5);
                    tempMarker.on("click", () => {
                        this.selectState(key);
                        
                        const stateDropdown = document.getElementById("statesDropDown");
                        for(let i = 0; i < stateDropdown.options.length;i++){
                            if(stateDropdown.options[i].value == key ){
                                stateDropdown.options[i].selected = true;
                            }
                        }                        
                        
                    });
                    tempMarker.didRender = () => {
                        const overlayContext = this.overlay.canvasView.node.getContext("2d");
                        const currX = tempMarker.anchor.x;
                        const currY = tempMarker.anchor.y;
                        let currCount = 0;
                        const iconScale = 30;

                        switch(this.selectedDataLayer) {
                            default:
                            case "positive":
                                currCount = currCounts.get("positive").numberValue();
                                break;
                            case "negative":
                                currCount = currCounts.get("negative").numberValue();
                                break;
                            case "total":
                                currCount = currCounts.get("total").numberValue();
                                break;

                            
                        }
    
                        this.drawStateNumber(overlayContext, currCount, currX, currY, iconScale);
                    };
    
                    this.overlay.setChildView(key, tempMarker);
                    this.stateMapMarkers[key] = tempMarker;
    
                // }
            }

        }
    }

    drawTestingLocations() {
        console.info("draw testing locations");
        // console.info(this.testingLocationsList);
        this.clearMapMarkers()
        for(let key in this.testingLocationsList) { 
            const currCounts = this.testingLocationsList[key]; 
            // const currCountry = this.countriesList[key];
            if(currCounts) {
                // if(!this.countryMarkers[key]) {
                    let tempMarker = new swim.MapCircleView()
                        // .center([newLat, newLng])
                        .center(mapboxgl.LngLat.convert([currCounts.get("location_longitude"), currCounts.get("location_latitude")]))
                        .radius(5)
                        .fill(swim.Color.rgb(0, 200, 100, 0.5))
                        .stroke(swim.Color.rgb(0, 200, 100, 1))
                        .strokeWidth(1);

                    tempMarker.on("click", () => {
                        this.renderTestingLocationPopover(key);
                    });
    
                    this.overlay.setChildView(key, tempMarker);
                    this.stateMapMarkers[key] = tempMarker;
    
                // }
            }

        }
    }


    drawStateNumber(context, count, x, y, scale = 5) {
        const halfScale = scale/2;
        context.save();
        context.font = "20px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        // context.fillText(count, (scale*-1), (scale*-1), (scale*2), (scale*2));
        context.fillText(count, x, y+2, scale);
        context.restore();
    }       

    clearMapMarkers() {
        for(let key in this.stateMapMarkers) {
            this.stateMapMarkers[key].remove();
        }
    }

    clearCanvas() {
        // if (this.context) {
        //     const canvasWidth = this.context.canvas.clientWidth;
        //     const canvasHeight = this.context.canvas.clientHeight;
        //     this.context.clearRect(0, 0, canvasWidth, canvasHeight);
        //     this.canvas.width = 1;
        //     this.canvas.width = canvasWidth;
        // }
    }

    handleResize() {
        this.map.map.resize();
        this.map.cascadeResize();        
        this.updateMapBoundingBox();

        // this.map.getCachedElement("cec61646").cascadeResize();
        // this.map.getCachedElement("c3ab4b07").cascadeResize();
    }

    loadTemplate(templateId, swimElement, onTemplateLoad = null, keepSynced = false) {
        console.info("[IndexPage]: load template");
        swimElement.render(templateId, () => {
            if (onTemplateLoad) {
                onTemplateLoad();
            }
        }, keepSynced);
    }

    interpolate(startValue, endValue, stepNumber, lastStepNumber) {
        return (endValue - startValue) * stepNumber / lastStepNumber + startValue;
    }
 

    selectState(evt) {
        let lat = 0;
        let lng = 0;
        let newZoom = 6;
        this.selectedState = evt;

        this.hideTestingLocationPopover();

        if(evt == "us-all") {
            lat = "41.979246";
            lng = "-87.906914";
            newZoom = 3;
            this.hideStatePopover();
        } else {
            const locationInfo = this.stateLocationList[this.selectedState];
            if(locationInfo) {
                lat = locationInfo.get("latitude").stringValue();
                lng = locationInfo.get("longitude").stringValue();
            }
            this.renderStatePopover(this.selectedState);
        }
        if(lat !== 0 && lng !== 0 && newZoom !== 0) {
            this.map.map.setCenter([lng, lat]);
            this.map.map.setZoom(newZoom);
            
            
        }
    }

    hideStatePopover() {
        this.statePopoverView.hidePopover(this.fastTween);
    }

    hideTestingLocationPopover() {
        this.testingLocationPopoverView.hidePopover(this.fastTween);
    }
    selectDataLayer(evt) {
        this.selectedDataLayer = evt;
        if(evt == "testingLocations") {
            this.drawTestingLocations();
        } else {
            this.drawCountsByState();
        }
        
    }

    checkBounds = (currTrackPoint, boundingBox) => {
        let currLong = currTrackPoint.get("lng").numberValue();
        let currLat = currTrackPoint.get("lat").numberValue();
        let inBounds = true;

        if(currLat > boundingBox[0].lat) {
            inBounds = false;
            currLat = boundingBox[0].lat;
        }

        if(currLat < boundingBox[1].lat) {
            inBounds = false;
            currLat = boundingBox[1].lat;
        }

        if(currLong < boundingBox[0].lng) {
            inBounds = false;
            currLong = boundingBox[0].lng;
        }

        if(currLong > boundingBox[1].lng) {
            inBounds = false;
            currLong = boundingBox[1].lng;
        }        
        
        return [currLat, currLong, inBounds];
    }    
}