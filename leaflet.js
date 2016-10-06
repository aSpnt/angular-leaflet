/**
 * Created by aivanov on 23.05.2016.
 */
(function (ng, undefined){
    'use strict';

    ng.module('angular-leaflet-directive', []).run(['$templateCache', function ($templateCache) {
    $templateCache.put('template/leaflet.html','<div style="width: 100%; height: 100%" ng-transclude></div>');
}]);

    ng.module('angular-leaflet-directive').directive('leaflet', function () {

    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        scope: {
            server: '=server',
            control: '=',
            items: '=',
            lat: '@',
            lon: '@',
            name: '@'
        },
        template: 'template/leaflet.html',
        controller: ["$scope", function(scope) {
            // Позволяет использовать путь до нужного свойства
            scope.getDescendantProp = function(obj, desc) {
                var arr = desc.split(".");
                while(arr.length && (obj = obj[arr.shift()]));
                return obj;
            }
        }],
        link: function (scope, element, attr) {
            scope.mymap = L.map(element[0]).setView([55.15, 61.40], 13);

            scope.markers = [];

            scope.internalControl = scope.control || {};
            scope.internalControl.invalidate = function() {
                scope.mymap.invalidateSize();
            }

            L.tileLayer(scope.server, {
                maxZoom: 18
            }).addTo(scope.mymap);

            $(element[0].firstChild).resize(function() {
                scope.mymap.invalidateSize();
            })

            scope.recreateMarkers = function() {
                for (var i = 0; i < scope.markers.length; i++) {
                    scope.mymap.removeLayer(scope.markers[i]);
                }
                scope.markers = [];
                for (var i = 0; i < scope.items.length; i++) {
                    var icon = L.ExtraMarkers.icon({
                        icon: 'fa-car',
                        markerColor: 'red',
                        shape: 'square',
                        prefix: 'fa'
                    });
                    scope.markers[i] = new L.marker([scope.items[i][scope.lat], scope.items[i][scope.lon]], {icon: icon});
                    scope.markers[i].bindLabel(scope.getDescendantProp(scope.items[i], scope.name), {noHide: true, className: "car-label", offset: [0, 0] });
                    scope.markers[i].addTo(scope.mymap);
                }
            }

            /* Настройка изменений маркеров */
            scope.$watchCollection('items', function(newItems, oldItems) {
                scope.recreateMarkers();
            });

            /* Настройка триггеров перерисовки */
            scope.$watch(
                function () {
                    return element[0].getBoundingClientRect().height;
                },

                function () {
                    scope.mymap.invalidateSize();
                });

            scope.$watch(
                function () {
                    return element[0].getBoundingClientRect().width;
                },

                function () {
                    scope.mymap.invalidateSize();
                });
        }
    };
});

})(angular);
