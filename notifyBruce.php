<?php
 $to = "brucehubbard@gmail.com";
 $subject = $_GET["name"] . " (" . $_GET["id"] . ") used the app";
 $body = $_GET["name"] . " (" . $_GET["id"] . ") used the app";
 if (mail($to, $subject, $body)) {
   echo("<p>Message successfully sent!</p>");
  } else {
   echo("<p>Message delivery failed...</p>");
  }
 ?>