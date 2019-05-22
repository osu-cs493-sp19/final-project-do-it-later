# creates containers that aren't created yet, starts them if they have been created -d detaches terminal so you can use it again
# docker-compose up -d

# stops all the containers that were brought up by earlier up command
# docker-compose stop

# stops all the containers and removes them
# docker-compose down

# rebuilds all images INCLUDING MONGO
# docker-compose build

kill all docker containers 
docker kill $(docker ps -q)