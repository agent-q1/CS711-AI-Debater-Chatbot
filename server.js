require('@tensorflow/tfjs');
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const neo4j = require('neo4j-driver')

// const api = require('./neo4jApi');

const driver = neo4j.driver("neo4j://localhost:7687", neo4j.auth.basic("neo4j", "suhas"))

const personName = 'Alice'

const sentences = [
  'Testing 123',
  'The earth is flat because when we look around, it seems like it.',
  'The earth is round because other heavenly bodies like the sun and moon are round. ',
  'The sun and moon both glow, but the earth doesnt. Hence you cannot make a direct implication like stated. ',
  'The earth is round because lots of smart people believe it to be right now.',
  'Lots of smart people also believed that the earth was flat 100 years ago. ',
  'The earth casts a spherical shadow on the moon ',
  'A flat circular earth could cast a spherical shadow ',
  ' Flat Earthers are stupid ',
  'Many things might not be as they seem. ',
  ' Authentic Photographs of a spherical earth from space have been found ',
  'Photographs from space can be fabricated',
  'Ships coming up from long distances appear to rise above water as the approach closer',
  ' Rising of ships occur due to a consequence of bending of light ',
  'There is no reason why lots of smart people would be lying',
  'It is a conspiracy they are running ',
  'Scientists have proven that light effects arent at play',
  'Lets see if this baby fires up '
  

];

const use = require('@tensorflow-models/universal-sentence-encoder');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');
const { util } = require('@tensorflow/tfjs');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'AI Lawyer';

let embeddedSentences = []



const tloadcsv1 = async function (){
  const session = driver.session()
  session.writeTransaction((tx) => {
    tx.run("LOAD CSV WITH HEADERS FROM 'file:///desktop-csv-import/earth_arguments.csv' AS row \
    WITH toInteger(row.Index) as index, row.Argument as argument \
    MERGE (a:Argument {index: index}) \
    ON CREATE SET a.Argument = argument " 
    
    ).then(result => {  
      
      
     
      
    })
    .catch(error => {
      throw error ;
    })
    .finally(() => {
      return session.close();
    });
  });

  


 
}

const tloadcsv2 = async function() {
  const session = driver.session()
  session.writeTransaction((tx)=> {
    tx.run("LOAD CSV WITH HEADERS FROM 'file:///desktop-csv-import/earth_test_relations.csv' AS row \
    WITH toInteger(row.attacked) as attackedID , toInteger(row.attacking) as attackingID, toFLoat(row.attack) as attackValue \
    MATCH (a:Argument {index: attackedID}) \
    MATCH (b: Argument {index: attackingID}) \
    MERGE (a)-[r:RATTACK {attackValue: attackValue}]->(b) "
    ).then(result => {

    })
    .catch(error => {
      throw error;
    })
    .finally(() => {
      return session.close();
    });

  });

}
const deleteAll = async function(){
  const session = driver.session()
  session.writeTransaction((tx)=> {
    tx.run("MATCH (n) \
    DETACH DELETE n "
    ).then(result => {

    })
    .catch(error => {
      throw error;
    })
    .finally(() => {
      return session.close();
    });

  });

}
const loadCSV = async function(){

   await tloadcsv1();
   await tloadcsv2();

  

 
}

const test = async function(personName) {
  const session = driver.session()
  try {
    const result = await session.run(
      'CREATE (a:Person {name: $name}) RETURN a',
      { name: personName }
    )
  
    const singleRecord = result.records[0]
    const node = singleRecord.get(0)
  
    console.log(node.properties.name)
  } finally {
    await session.close()
  }
  
}

const findPath = async function(index){
  paths = []
  const session = driver.session();

  try {
    const result = await session.run(
      'MATCH (a: Argument {index: $index}) \
      MATCH (b: Argument) \
      MATCH p = (a)-[:RATTACK *2 ]->(b) \
      RETURN relationships(p) AS path ',
      { index: index }
    )
  
   

    let utility = 0.0
    let maxutil = -100

    result.records.forEach(res => {

      paths.push(res.get("path") ) 

    }); 

    for(const path of paths){

      let counter = 0
      utility = 0.0

      for(const r of path){

        console.log(r)
        if(!r.properties.attackValue){
          continue;
        }

        if(counter%2 == 0)utility = utility + r.properties.attackValue
        else utility = utility - r.properties.attackValue

        counter=counter+1
      }

      if(maxutil<utility)maxutil = utility

    }

    if(maxutil==-100)return 0


    return maxutil
  
    // console.log(node.properties.name)
  } finally {
    await session.close()
  }
  
}

const scale = (num, in_min, in_max, out_min, out_max) => {
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

const find_weakness = async function(index) {

  const session = driver.session()
  try {
    const result = await session.run(
      "MATCH (a: Argument {index: $index} ) \
       MATCH (b: Argument ) \
       MATCH (a)-[r: RATTACK]->(b) \
       RETURN sum(r.attackValue) as weakness ",
      { index: index }
    )
  
    const singleRecord = result.records[0]
    const weakness  = singleRecord.get("weakness")
    console.log("entered  asdfasdfacaecasdcsad")
    console.log(weakness)
    console.log(scale(weakness,0,3,0,0.5))
    const scaled_weakness = scale(weakness,0,3,0,0.5)

    
    return scaled_weakness
  } finally {
    await session.close()
  }
  

}

const findNext = async function(index){

  const session = driver.session()
  try {
    const result = await session.run(
      'MATCH (a: Argument {index: $index}) \
      MATCH (b: Argument) \
      MATCH (a)-[r:RATTACK ]->(b) \
      RETURN r.attackValue AS attackval, b as attackedNode' ,
      { index: index }
    )

    let maxutil = -100.0
    let maxattackId = index

    for( const record of result.records){

      let attackedNode = record.get("attackedNode")
      let attackval = record.get("attackval")

      if(attackval){

        console.log(attackedNode.properties.index.low )

        let attackId = attackedNode.properties.index.low
        console.log(attackval)

        let tutil = await findPath(attackId)
        let weakness = await find_weakness(attackId)
        console.log("weakness : ")
        console.log(weakness)

        console.log("tutil")
          console.log(tutil)

        let util = attackval - weakness - tutil

          if(util > maxutil){
            maxutil = util
            maxattackId = attackId
            console.log("max att ")
            console.log(maxattackId)
          }

  

     


      }


    }


    

    

    return maxattackId
   } finally {
    await session.close()
  }



}

const findNextArgument = async function(index){
  let nextIndex = await findNext(index)
  console.log("next index is ")
  console.log(nextIndex)
  const session = driver.session()
  try {
    const result = await session.run(
      'MATCH (a:Argument {index: $next_index}) RETURN a.Argument ',
      { next_index: nextIndex }

    )

  //  result.records.forEach(record => {
  //   return(record.get("a.Argument"))

  for(record of result.records){
    return(record.get("a.Argument"))

  }

  //  })
  
  } finally {
    await session.close()
  }

}
  



function dotProduct(vecA, vecB){
  let product = 0;
  for(let i=0;i<vecA.length;i++){
      product += vecA[i] * vecB[i];
  }
  return product;
}

function magnitude(vec){
  let sum = 0;
  for (let i = 0;i<vec.length;i++){
      sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(vecA,vecB){
  return dotProduct(vecA,vecB)/ (magnitude(vecA) * magnitude(vecB));
}

const findEmbedding = async function(sentence){

  use.load().then(model => {

    model.embed(sentence).then(embeddings => {
      // `embeddings` is a 2D tensor consisting of the 512-dimensional embeddings for each sentence.
      // So in this example `embeddings` has the shape [2, 512].
      // embeddings.print(true /* verbose */);
      embeddings.array().then(array => {
        console.log(array)

        maxsim = 0.0
        maxmatchindex = 1

        for(let i = 1;i<=17;i++){
          let curembedding = embeddedSentences[0][i]
          console.log("Cure embed ")
          // console.log(curembedding)
          let csim = cosineSimilarity(curembedding, array[0])
          console.log(csim)
          if(csim>maxsim){
            maxmatchindex = i
            maxsim = csim

          }

        }

        console.log(maxmatchindex)

        console.log(sentences[maxmatchindex])

        findNextArgument(maxmatchindex).then((nextArgument)=> {

          console.log(nextArgument)
          socket.emit('message', formatMessage(botName, nextArgument));
    
        });
        
        
  
       })
    });

  })

}

const loadEmbeddings = async function() {

  


  use.load().then(model => {
    // Embed an array of sentences.
  
      
      
  
        
        model.embed(sentences).then(embeddings => {
          // `embeddings` is a 2D tensor consisting of the 512-dimensional embeddings for each sentence.
          // So in this example `embeddings` has the shape [2, 512].
          // embeddings.print(true /* verbose */);
          embeddings.array().then(array => {

            embeddedSentences.push(array)
            console.log("Loaded embeddings")
            // console.log(embeddedSentences)
           
          })
        });
    
     
  
    
  
      
  
   
  
   
    
    
  });

}



// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Are you ready to have a debate with me?'));

    loadCSV();

    loadEmbeddings();
    

    

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  const sendresponse = async function(msg){

    msgarray = []
    msgarray.push(msg)

    const sentence_embedding = await findEmbedding(msgarray)

    console.log("Send Resp")

    console.log(sentence_embedding)



  }

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
    //Run algo
    sentence = msg
    use.load().then(model => {

    model.embed(sentence).then(embeddings => {
      // `embeddings` is a 2D tensor consisting of the 512-dimensional embeddings for each sentence.
      // So in this example `embeddings` has the shape [2, 512].
      // embeddings.print(true /* verbose */);
      embeddings.array().then(array => {
        console.log(array)

        maxsim = 0.0
        maxmatchindex = 1

        for(let i = 1;i<=17;i++){
          let curembedding = embeddedSentences[0][i]
          console.log("Cure embed ")
          // console.log(curembedding)
          let csim = cosineSimilarity(curembedding, array[0])
          console.log(csim)
          if(csim>maxsim){
            maxmatchindex = i
            maxsim = csim

          }

        }

        console.log(maxmatchindex)

        console.log(sentences[maxmatchindex])

        findNextArgument(maxmatchindex).then((nextArgument)=> {

          console.log(nextArgument)
          socket.emit('message', formatMessage(botName, nextArgument));
    
        });
        
        
  
       })
    });

  })
    
    

       //io.to(user.room).emit('message', formatMessage(botname, msg));
   
    
   
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
