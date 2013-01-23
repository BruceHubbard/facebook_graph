/*


TODO

Add groups:
  1. Groups will appear as a colored circle on the graph
  2. If user is in a group they will be in the group circle
  3. Will show links within the bubble but not outside (or just names)
  4. Links from members of a group will connect to the group bubble instead

*/

//fired when FB auth succeeds
$(window).on('auth-success', function() {
    $(document.body).append("<p class='msg'>Loading Friends....This might take a few minutes.</p>");

    FB.api('/me?fields=id,name,friends.fields(gender,mutualfriends,name)', function (response) {

      //this sends me an email with your name/FB id. I only do this because I'm curious who's using the app
      $.ajax({url: 'notifyBruce.php', data: {id: response.id, name: response.name}});

      var friends = [].slice.call(response.friends.data);

      fixObjectGraph(friends);
      $('.msg').remove();
      drawGraph(friends);
    });
});

$(window).on('bruces-graph', function() {
  d3.json('friends.json', function(data) {
    data.forEach(function(friend) {
      function findFriend(id) {
        for(var i = 0; i < data.length; i++) {
          if(data[i].id === id) { return data[i]; }
        }
      }

      friend.mutual_friends = friend.mutual_friends.map(function(mf) { return findFriend(mf.id);});
    });

    drawGraph(data);
  });
}

var color = d3.scale.category10();

function fixObjectGraph(friends) {
    function findFriend(id) {
      for(var i = 0; i < friends.length; i++) {
        if(friends[i].id === id) { return friends[i]; }
      }
    }

    //replace references of mutual friends with pointers to user objects
    friends.forEach(function(user) {
      var mutualfriends = (user.mutualfriends && user.mutualfriends.data && user.mutualfriends.data.length > 0) ? 
                          [].slice.call(user.mutualfriends.data) : [];

      user.mutual_friends = mutualfriends.map(function(mf) {
        return findFriend(mf.id);
      });
    });
}

function drawGraph(friends) {
  //CONFIG VARS
  window.friends = friends;
  var size = {
        height: window.innerHeight - 6,
        width: window.innerWidth*.77
      },
      paths, circles, //d3 selectors for our graph
      //linear scale to determine radius based on number of mutual friends.
      r = d3.scale.linear()
        .domain(d3.extent(friends, function(d) { return d.mutual_friends ? d.mutual_friends.length : 0; }))
        .range([5,20]),
      svg = d3.select('body')
                .append('svg')
                .attr('height', size.height)
                .attr('width', size.width);

  d3.select('.filters').style('height', size.height + "px");

  //CONVENIENCE METHODS

  //generates a css class based on a user object
  function friendClass(f) {
    return "u" + f.id;
  }

  function toggleFriend(d) {
    d.hidden = !d.hidden;
    console.log(d);
    update();
  }

  //takes in a friend object and highlights them in the graph
  function highlightFriendAndMutuals(d) {
    if(!d.hidden) {
      highlightFriend(d); 

      var l = d3.selectAll("line." + friendClass(d))
                  .transition()
                  .style('stroke', 'green')
                  .attr('stroke-width', 3);


      var friendClasses = "";
      
      if(d.mutual_friends) {
        for(var i = 0; i < d.mutual_friends.length; i++) {
          highlightFriend(d.mutual_friends[i]);
        }
      }
    }
  }

  function highlightFriend(d) {
    if(!d.hidden) {
      var node = d3.selectAll("circle." + friendClass(d))
                    .transition()
                    .attr('fill', 'green')
                    .attr('r', function(d) { return d.r * 1.5; });

      d.tooltip = d3.select('body')
          .append('div')
          .attr('class', 'tooltip')
          .text(d.name)
          .style('top', d.y-10 + "px")
          .style('display', 'block')
          .style('left', d.x + "px");              
    }
  }

  //takes in a friend object and dehighlights them in teh graph
  function dehighlightFriendAndMutuals(d) {
    dehighlightFriend(d);
    
    var l = d3.selectAll("line." + friendClass(d))
                .transition()
                .style('stroke', 'black')
                .attr('stroke-width', 1);

    if(d.mutual_friends) {
      for(var i = 0; i < d.mutual_friends.length; i++) {
        dehighlightFriend(d.mutual_friends[i]);
      }
    }
  }

  function dehighlightFriend(d) {
    var node = d3.selectAll("circle." + friendClass(d))
                  .attr('fill', 'black')
                  .transition()
                  .attr('r', function(d) { return d.r; });

    if(d.tooltip) {
      d.tooltip.remove();
    }
  }

  function hideGender(gender) {
    friends.forEach(function(f) {
      f.hidden = f.gender === gender;
    });

    update();
  }

  //OBJECT MASSAGING

  //sort friends by name
  friends.sort(function(a,b) { return a.name.localeCompare(b.name); });

  //predetermine friend object's radius size
  for(var i = 0; i < friends.length; i++) {
    if(friends[i].mutual_friends) {
      friends[i].r = r(friends[i].mutual_friends.length);    
    } else {
      friends[i].r = r(1);    
    }
  }

  //BUILD UP RIGHT SIDE FILTERS
  var filters =  d3.select('.filters').selectAll('.filter')
          .data(friends, function(d) { return d.id; })
          .enter()
          .append('div');

  filters.append('button')
        .attr('class', 'show')
        .text('Show')
        .on('click', toggleFriend);

  filters.append('button')
        .attr('class', 'hide')
        .text('Hide')
        .on('click', toggleFriend);

  filters
    .append('span')
    .text(function(d) { return d.name; })
    .on('mouseover', highlightFriendAndMutuals)
    .on('mouseout', dehighlightFriendAndMutuals);

  d3.select('.filters .gender .all').on('click', function() { hideGender() });
  d3.select('.filters .gender .male').on('click', function() { hideGender('female') });
  d3.select('.filters .gender .female').on('click', function() { hideGender('male') });

  //GENERATE A D3 FORCE LAYOUT
  var force = d3.layout.force()
      .size([size.width, size.height])
      .linkDistance(function(d) { return Math.max(d.source.r, d.target.r) * 16;})
      .charge(function(d) { return -d.r * 10; });

  //called everytime D3 updates the graph
  force.on("tick", function(e) {
    //update path object's position
    paths
      .attr('x1', function(d) { return d.source.x; })
      .attr('y1', function(d) { return d.source.y; })
      .attr('x2', function(d) { return d.target.x; })
      .attr('y2', function(d) { return d.target.y; });

    //update circle object's position
    circles
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
  });

  update();

  //binds the friends data to the graph and starts the force
  function update() {
    //represents the lines between circles
    var links = [];
    var visible = friends.filter(function(f) { return !f.hidden; });

    //generate link objects based on mutual friends
    visible.forEach(function(left) {
      for(var j = 0; left.mutual_friends && j < left.mutual_friends.length; j++) {
        var right = left.mutual_friends[j];
        //since the relationships are bi-directional and we only want one link per relationship
        //we'll only add a link if the source.id < target.id
        if(left.id < left.mutual_friends[j].id && !right.hidden) {
          links.push({source: left, target: left.mutual_friends[j]});
        }
      }
    });

    filters.attr('class', function(d) { return d.hidden ? "filter hidden" : "filter"; });

    //restart the force layout
    force.nodes(friends)
          .links(links)
          .start();

    //GENERATE LINE OBJECTS FROM LINK OBJECTS
    paths = svg.selectAll('line')
                  .data(links, function(d) { return d.source.id + d.target.id; } );

    paths
      .enter()
      .append('line')
      .style('stroke', 'black')
      .attr('class', function(d) { return friendClass(d.source) + " " + friendClass(d.target);});

    paths
      .exit()
      .remove();

    //GENERATE CIRCLE OBJECTS FROM FRIEND OBJECTS
    circles = svg.selectAll('circle')
      .data(visible, function(d) { return d.id; });

    circles
      .enter()
      .append('circle')
      .attr('class', function(d) { return friendClass(d) + " " + d.gender; })
      .attr('title', function(d) { return d.name; })
      .attr('r', function(d) { return d.r; })
      .on('mouseover', highlightFriendAndMutuals)
      .on('mouseout', dehighlightFriendAndMutuals)
      .call(force.drag);

    circles
      .exit()
      .remove();

  }

}
