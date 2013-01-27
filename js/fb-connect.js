$(document).ready(function(){

  //notacog
  //var appId = "249588255171672";
  //local
  var appId = "118794951629107";
  // If logging in as a Facebook canvas application use this URL.
  //var redirectUrl = "http://apps.facebook.com/YOUR_APP_NAMESPACE";
  // If logging in as a website do this. Be sure to add the host to your application's App Domain list. 
  var redirectUrl = window.location.href;


  // If the user did not grant the app authorization go ahead and
  // tell them that. Stop code execution.
  if (0 <= window.location.href.indexOf ("error_reason"))
  {
   $(document.body).append ("<p>Authorization denied!</p>");
   return;
  }


  // When the Facebook SDK script has finished loading init the
  // SDK and then get the login status of the user. The status is
  // reported in the handler.
  window.fbAsyncInit = function(){

   //debugger;

   FB.init({
    appId : appId,
    status : true,
    cookie : true,
    oauth : true
    });

   // Sandbox Mode must be disabled in the application's settings
   // otherwise the callback will never be invoked. Monitoring network
   // traffic will show an error message in the response. Change the
   // Sandbox Mode setting in: App Settings - Advanced - Authentication.
   FB.getLoginStatus (onCheckLoginStatus);
  };


  // Loads the Facebook SDK script.
  (function(d)
  {
   var js, id = 'facebook-jssdk'; if (d.getElementById(id)) {return;}
   js = d.createElement('script'); js.id = id; js.async = true;
   js.src = "https://connect.facebook.net/en_US/all.js";
   d.getElementsByTagName('head')[0].appendChild(js);
  }(document));


  // Handles the response from getting the user's login status.
  // If the user is logged in and the app is authorized go ahead
  // and start running the application. If they are not logged in
  // then redirect to the auth dialog.
  function onCheckLoginStatus (response)
  {
   if (response.status != "connected")
   {
    top.location.href = "https://www.facebook.com/dialog/oauth?client_id=" + appId + "&redirect_uri=" + encodeURIComponent (redirectUrl) + "&scope=user_photos,friends_photos";
   }
   else
   {
    $(window).trigger('auth-success');
   }
  }
});
