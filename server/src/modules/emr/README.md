# emr module

This bounded context owns **medical_records, medical_reports** and groups its HTTP controllers, data-access models, routes, validators, services, and views as nested MVC.

## Public contract

Use `require('./modules/emr')` from other server modules. Internal folders are implementation details. Existing global paths remain compatibility facades.

## Events

Domain side effects use the shared event bus in `core/events/eventBus.js`. Event payloads must contain identifiers and non-sensitive operational data only.

