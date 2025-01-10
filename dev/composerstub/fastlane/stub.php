<?php
spl_autoload_register(function ($class) {
    if (str_starts_with($class, 'Paypal\\Fastlane\\') && !class_exists($class)) {
        $dynamicClass = new class {
            public function __construct(...$params) {

            }
            public function __call($name, $arguments) {

            }
        };
        class_alias(get_class($dynamicClass), $class);
    }
});
