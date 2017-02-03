var sIdAISD = "bApartmentsInteractiveSchemeInitialized";
window[sIdAISD] = (typeof window[sIdAISD] === "undefined" ? false: true);

var oAIS;
var aRoomsStr = ["C", "1", "2", "3", "4"];
var aRoomsText = ["&#1057;&#1090;&#1091;&#1076;&#1080;&#1103;", "1", "2", "3", "4"];
var apartmentSoldStatus = 1;
var apartmentFreeStatus = 3;
var aApartmentsVisited;
if (! aApartmentsVisited) {
	aApartmentsVisited = getCookie("ais_apartments_visited");
	aApartmentsVisited = aApartmentsVisited ? aApartmentsVisited.split(",") : [];
}

if (! window[sIdAISD]) {
	window[sIdAISD] = true;
	
	oAIS = new (function() {
			
		var self = this;

		//this.oHouse = {};
		this.aApartments = [];
		this.aFloors = [];

		this.limits = {
			rooms: {},
			maxFloor: 0,
			minSquareCommon: 999,
			maxSquareCommon: 0,
			maxApartmentsnPlatform: 0
		};

		this.filters = {
			rooms: [],
			minFloor: ko.observable().extend({ rateLimit: 100 }),
			maxFloor: ko.observable().extend({ rateLimit: 100 }),
			minSquareCommon: ko.observable().extend({ rateLimit: 100 }),
			maxSquareCommon: ko.observable().extend({ rateLimit: 100 })
		};

		this.oApartmentMouseOver = ko.observable(null);
		this.oApartmentSelect = ko.observable(null);

		this.apartmentMouseover = function(oApartment) {
			if (oApartment.inFilter()) {
				self.oApartmentMouseOver(oApartment);
				oApartment.selected(true);
			}
		};
		this.apartmentMouseout = function(oApartment) {
			if (oApartment.inFilter()) {
				self.oApartmentMouseOver(null);
				oApartment.selected(false);
			}
		};
		this.apartmentClick = function(oApartment) {
			if (oApartment.inFilter()) {
				oApartment.visited(true);
				if (! aApartmentsVisited.find(
					function(id) { return id == oApartment.id; }
				)) {
					aApartmentsVisited.push(oApartment.id);
					setCookie("ais_apartments_visited", aApartmentsVisited, { path: "/"});
				}
				self.oApartmentSelect(oApartment);
				self.oApartmentMouseOver(oApartment);
			}
		};
		this.closeDetail = function() {
			self.oApartmentSelect(null);
			self.oApartmentMouseOver(null);
		};
		this.floorSelect = function(oFloor) {
			oFloor.selected(true);
		};
		this.floorDeselect = function(oFloor) {
			oFloor.selected(false);
		};

		this.clickFiltersRooms = function(filterRooms) {
			filterRooms.selected( ! filterRooms.selected() );
			$(".ais-filters-rooms button").blur();
		};
		this.clearFilters = function() {
			self.filters.rooms.forEach( function(o) { o.selected(false); });
			self.filters.minFloor(1);
			self.filters.maxFloor(self.limits.maxFloor);
			self.filters.minSquareCommon(self.limits.minSquareCommon);
			self.filters.maxSquareCommon(self.limits.maxSquareCommon);
			self.setFilters();
			$(".ais-filters-submits button").blur();
		};
		this.setFilters = function() {

			var isFilteredByRooms = false;
			for (var p in self.filters.rooms) {
				if (self.filters.rooms[p].selected()) {
					isFilteredByRooms = true;
					break;
				}
			}

			for (var i = 0; i < self.aFloors.length; i++) {
				for (var j = 0; j < self.aFloors[i].items.length; j++) {
					var oApartment = self.aFloors[i].items[j];
					if (oApartment.ArticleStatusCode != apartmentFreeStatus) continue;
					var inFilter = true;
					if (oApartment.squareCommon < self.filters.minSquareCommon()) inFilter = false;
					if (oApartment.squareCommon > self.filters.maxSquareCommon()) inFilter = false;
					if (oApartment.floor < self.filters.minFloor()) inFilter = false;
					if (oApartment.floor > self.filters.maxFloor()) inFilter = false;
					if (isFilteredByRooms) {
						for (var p in self.filters.rooms) {
							var o = self.filters.rooms[p];
							if ( (o.rooms == oApartment.rooms) && (! o.selected()) ) {
								inFilter = false;
								break;
							}
						}
					}
					oApartment.inFilter(inFilter);
				}
			}

			$(".ais-filters-submits button").blur();
		};
	});
	
	$(document).ready( function() {
		$.when(
			$.get("/ais_src/ais.html", {}, function(html) {
				$(".js-ais-content").append(html);
			}, "html"),
			/*$.get("/ais_src/data/house.xml", {}, function(xmlText) {
			//$.get("http://89.221.61.69/getarticlesales.svc/buildinglist/xml/59588B9F-1C70-E611-8094-00155D0C5A08", function(xmlText) {
				var $xml = $(xmlText);
				var $eBuilding = $xml.find("Building");
				if (! $eBuilding.length) $eBuilding = $xml.find("a\\:Building");
				for (var i = 0; i < $eBuilding.children().length; i++) {
					var eField = $eBuilding.children()[i];
					window.oAIS.oHouse[eField.localName] = $(eField).text();
				}
			}, "xml"),*/
			//$.get("/ais_src/data/apartments.xml", {}, parseData, "xml")
			$.ajax({
				url: "http://89.221.61.69/getarticlesales.svc/apartmentlist/xml/FAC614DD-3770-E611-8094-00155D0C5A08",
				type: "GET",
				dataType: "xml",
				//xhrFields: { withCredentials: true },
				error: function(oResponse) {
					$.get("/ais_src/data/apartments.xml", {}, parseData, "xml").done(run);
				},
				success: parseData
			})
		).done( function(oResp1, oResp2) {
			run();
		});
	});
}

function parseData(xmlText) {
	var $xml = $(xmlText);

	var $eApartments = $xml.find("Apartments");
	if (! $eApartments.length) $eApartments = $xml.find("a\\:Apartments");

	for (var i = 0; i < $eApartments.children().length; i++) {

		var $eApartment = $($eApartments.children()[i]);
		var oApartment = {};
		for (var j = 0; j < $eApartment.children().length; j++) {
			var eField = $eApartment.children()[j];
			oApartment[eField.localName] = $(eField).text();
		}

		oApartment.id = oApartment.ApartmentID.split("-")[0];
		oApartment.floor = +oApartment.floor;
		oApartment.numInPlatform = +oApartment.numInPlatform;
		oApartment.articlsalesCost = +oApartment.articlsalesCost.replace(/,/, ".");
		oApartment.squareCommon = +oApartment.squareCommon.replace(/,/, ".");
		oApartment.ArticleStatusCode = +oApartment.ArticleStatusCode;

		if (location.hash == "#ais_demo") {
			oApartment.ArticleStatusCode  = Math.random() < .5 ? false : apartmentFreeStatus;
		}

		oApartment.roomsStr = aRoomsStr[oApartment.rooms];
		oApartment.roomsText = aRoomsText[oApartment.rooms];

		oApartment.inFilter = ko.observable(oApartment.ArticleStatusCode == apartmentFreeStatus ? true : false);
		oApartment.selected = ko.observable(false);

		oApartment.visited = ko.observable( !!(aApartmentsVisited.find( function(id) {
			return id == oApartment.id;
		})) );

		oAIS.aApartments.push(oApartment);

		var floor = oApartment.floor;
		var numInPlatform = oApartment.numInPlatform;

		if (oApartment.ArticleStatusCode == apartmentFreeStatus) {
			oAIS.limits.maxApartmentsnPlatform = Math.max(oAIS.limits.maxApartmentsnPlatform, numInPlatform);
			oAIS.limits.maxFloor = Math.max(oAIS.limits.maxFloor, floor);
			oAIS.limits.minSquareCommon = Math.ceil(Math.min(oAIS.limits.minSquareCommon, oApartment.squareCommon) - .5);
			oAIS.limits.maxSquareCommon = Math.floor(Math.max(oAIS.limits.maxSquareCommon, oApartment.squareCommon) + .5);
			oAIS.limits.rooms[''+oApartment.rooms] = true;
		}

		var oFloor = oAIS.aFloors.find( function(oFloor) { return (oFloor.floor === floor); });
		if (! oFloor) { // Registrate current floor
			// Add missing floors
			for (var f = 1; f < floor; f++) {
				var _oFloor = oAIS.aFloors.find( function(oFloor) { return (oFloor.floor === f); });
				if (! _oFloor) 	oAIS.aFloors.push( createFloor(f) );
			}
			// Add current floor
			oFloor = createFloor(floor);
			oAIS.aFloors.push(oFloor);
		}

		// Fill empty apartments
		for (var f = 1; f < numInPlatform; f++) {
			if (! oFloor.items[f - 1]) {
				oFloor.items[f - 1] = createEmptyApartment(numInPlatform);
			}
		}

		oFloor.items.push(oApartment);
	} // /for: $eApartments.children()

	// Fill empty floors
	for (var i = 0; i < oAIS.aFloors.length; i++) {
		var oFloor = oAIS.aFloors[i];
		for (var f = 1; f <= oAIS.limits.maxApartmentsnPlatform; f++) {
			if (! oFloor.items[f - 1]) {
				oFloor.items[f - 1] = createEmptyApartment(f);
			}
		}
	}

	// Prepare filters
	for (var p in oAIS.limits.rooms) {
		oAIS.filters.rooms.push({
			rooms: p,
			roomsText: aRoomsText[p],
			selected: ko.observable(false)
		});
	}
	oAIS.filters.minFloor.subscribe( function(_value) {
		var value = +_value || 1;
		value = Math.min(Math.max(1, value), oAIS.filters.maxFloor());
		if (value != _value) oAIS.filters.minFloor(value);
	});
	oAIS.filters.maxFloor.subscribe( function(_value) {
		var value = +_value || oAIS.limits.maxFloor;
		value = Math.max(Math.min(oAIS.limits.maxFloor, value), oAIS.filters.minFloor());
		if (value != _value) oAIS.filters.maxFloor(value);
	});
	oAIS.filters.minSquareCommon.subscribe( function(_value) {
		var value = +_value || oAIS.limits.minSquareCommon;
		value = Math.min(Math.max(oAIS.limits.minSquareCommon, value), oAIS.filters.maxSquareCommon());
		if (value != _value) oAIS.filters.minSquareCommon(value);
	});
	oAIS.filters.maxSquareCommon.subscribe( function(_value) {
		var value = +_value || oAIS.limits.maxSquareCommon;
		value = Math.max(Math.min(oAIS.limits.maxSquareCommon, value), oAIS.filters.minSquareCommon());
		if (value != _value) oAIS.filters.maxSquareCommon(value);
	});
	oAIS.clearFilters();

	// Reverse aFloors
	oAIS.aFloors = oAIS.aFloors.reverse();
}

function run() {
	ko.applyBindings(oAIS);
			
	var tmr1 = setInterval(function() {
		var w_roof = $(".ais-floor:eq(0) > div").width();
		if ($(".js-ais-roof").width() != w_roof) $(".js-ais-roof").width(w_roof);
		var w_basement = $(".ais-floor:eq(0) > div").width() + 10;
		if ($(".js-ais-basement").width() != w_basement) $(".js-ais-basement").width(w_basement);
	}, 100);
	setTimeout( function() { clearInterval(tmr1); }, 3000);
	
	// TODO: DEL:
	/*for (var i = 0; i < oAIS.aApartments.length; i++) {
		if (oAIS.aApartments[i].inFilter()) {
			oAIS.oApartmentSelect(oAIS.aApartments[i]);
			oAIS.oApartmentMouseOver(oAIS.aApartments[i]);
			break;
		}
	}*/
}

function createFloor(floor) {
	return {
		floor: floor,
		items: [],
		selected: ko.observable(false)
	}
}
					
function createEmptyApartment(numInPlatform) {
	return {
		numInPlatform: numInPlatform,
		ArticleStatusCode: 0,
		inFilter: ko.observable(false),
		selected: ko.observable(false),
		visited: ko.observable(false),
		section: "",
		floor: 0,
		roomsText: "",
		squareCommon: 0,
		articlsalesCost: 0
	};
}

if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, "find", {
    value: function(predicate) {
      if (this === null) {
        throw new TypeError('Array.prototype.find called on null or undefined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      var list = Object(this);
      var length = list.length >>> 0;
      var thisArg = arguments[1];
      var value;

      for (var i = 0; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list)) {
          return value;
        }
      }
      return undefined;
    }
  });
}