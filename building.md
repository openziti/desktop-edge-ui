# Ziti Desktop Edge

The Ziti Desktop Edge is an application that is necessary to integrate applications which cannot embed a Ziti SDK
directly into the application. This is colloquially known as a "brown field" Ziti-enabled application because the app
itself has no understanding that it has been Ziti-enabled.

In order for an application that has no knowledge of being Ziti-enabled to work the connections established by the app
must be intercepted before leaving the computer and routed through the Ziti network. This is accomplished by three main
components:

* An electron interface to allow users to view information about their current local environment

Build steps

* npm install
* npm start

Steps to create release

* npm install
* npm make
