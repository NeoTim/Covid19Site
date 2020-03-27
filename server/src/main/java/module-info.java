open module swim.covid {
  requires transitive swim.api;
  requires swim.server;
  requires swim.client;
  requires swim.xml;
  
  requires org.apache.httpcomponents.httpclient;
  requires org.apache.httpcomponents.httpcore;

  requires org.apache.httpcomponents.httpasyncclient;
  requires org.apache.httpcomponents.httpcore.nio;
  requires commons.math3;  

  requires java.xml;

  exports swim.covid;
}
