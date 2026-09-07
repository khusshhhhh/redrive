// Black-and-white Google Maps style for the /explore map view — desaturated
// land, hairline roads, muted water, POI/transit clutter hidden — so the only
// colour on the map is the listing markers.
//
// `styles` is ignored when a vector `mapId` is set, so the explore map opts out
// of `mapId` and uses this instead.
export const MONO_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "all", elementType: "geometry", stylers: [{ saturation: -100 }] },
  { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#5c5c5c" }] },
  { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 3 }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road.local", elementType: "labels.text", stylers: [{ visibility: "simplified" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f2f2f2" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#e9e9e9" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dedede" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d9d9d9" }] },
];
