# Voting System
this is a Voting System based on a database and server. <br> <br>
This system uses a NPM(Node Package Manager) modules. Here is how you install them. <br>
- open a cmd terminal.<br>
- and use CD to navigate to your voting system directory<br>

```
CD path/to/your/voting-system
```
then use the following command to install the modules:<br>

```
npm install
```
# Content And Feature
Here is a user guide on how to use this Voting system.
to start the server you can either use a cmd terminal navigate 
to your voting system folder then use node server.js. Or you 
can double-click the Start-Server.vbs file for silent launch.
<br>
now your in the voting system terminal. From here you
can run````port xxxx-x```` to choose a port, Default '3000'. 
then you can run ````start```` to start the server. For a full 
list off commands use````help or ?```` in the server terminal.
<br>
# Database
this system uses sqlite3 database to store and manage data. data
like voting pools, and users ID's. here are some of the Features:
* create a voting pool with x Options
* Database to ui communication via Chart.js
* easy login system
* Encrypt user ID's with crypto module
* Command line to manipulate the database
  * Add command to add new pools and or users
  * remove command to remove pools and or users

# server
the server is a simple Node.js server that uses Express.js to 
handle the requests. it uses a mix of endPoints and terminal
commands to give the user a full control over the server. 
<br> <br>
One of the server features in the monitor command. if you use 
````monitor```` in the server terminal it will open a new window 
that starts monitoring the server requests. 