# subscriptions module

This bounded context owns **subscription_plans, clinic_subscriptions** and groups its HTTP controllers, data-access models, routes, validators, services, and views as nested MVC.

## Public contract

Use `require('./modules/subscriptions')` from other server modules. Internal folders are implementation details. Existing global paths remain compatibility facades.

## Events

Domain side effects use the shared event bus in `core/events/eventBus.js`. Event payloads must contain identifiers and non-sensitive operational data only.

