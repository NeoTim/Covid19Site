package swim.covid.agents;

import com.microsoft.azure.eventhubs.EventHubException;

import swim.api.SwimLane;
import swim.api.agent.AbstractAgent;
import swim.api.lane.CommandLane;
import swim.api.lane.MapLane;
import swim.api.lane.ValueLane;
import swim.concurrent.TimerRef;
import swim.recon.Recon;
import swim.structure.Record;
import swim.structure.Value;
import swim.uri.Uri;
import swim.json.Json;
import swim.util.Cursor;
import swim.structure.Item;
import swim.covid.configUtil.ConfigEnv;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.ByteArrayInputStream;

import java.util.Iterator;

public class AggregationAgent extends AbstractAgent {

  @SwimLane("stateLocations")
  MapLane<String, Record> stateLocations = this.<String, Record>mapLane();

  @SwimLane("stateTestScores")
  MapLane<String, Record> stateTestScores = this.<String, Record>mapLane();

  @SwimLane("testingLocations")
  MapLane<String, Record> testingLocations = this.<String, Record>mapLane();

  @SwimLane("addStateLocation")
  public CommandLane<Record> addStateLocationCommand = this.<Record>commandLane()
    .onCommand((Record locationInfo) -> {
      String stateId = locationInfo.get("id").stringValue();
      String stateName = locationInfo.get("name").stringValue();

      this.stateLocations.put(stateId, locationInfo);
      this.stateLocations.put(stateName, locationInfo);
      // System.out.println(locationInfo);
    });

  @SwimLane("receiveStateTestScores")
  public CommandLane<Record> receiveStateTestScoresCommand = this.<Record>commandLane()
    .onCommand((Record scoreInfo) -> {
      final Iterator<Item> rows = scoreInfo.iterator();
      while(rows.hasNext()) {
        Item currentRow = rows.next();
        String stateId = currentRow.get("state").stringValue("none");
        Value locationInfo = this.stateLocations.get(stateId);
        Record newStateRecord = Record.create()
          .slot("id", stateId)
          .slot("name", locationInfo.get("name").stringValue())
          .slot("latitude", locationInfo.get("latitude"))
          .slot("longitude", locationInfo.get("longitude"))
          .slot("positive", currentRow.get("positive"))
          .slot("negative", currentRow.get("negative"))
          .slot("total", currentRow.get("totalTestResults"));
  
        this.stateTestScores.put(stateId, newStateRecord);        
      }
      
    });

  @SwimLane("requestTestScores")
  public CommandLane<Value> requestTestScoresCommand = this.<Value>commandLane()
    .onCommand((Value scoreInfo) -> {
      this.getTestScoresByState();
    });
      
  @SwimLane("addTestingLocation")
  public CommandLane<Record> addTestingLocationCommand = this.<Record>commandLane()
    .onCommand((Record locationInfo) -> {
      String locationId = locationInfo.get("location_id").stringValue();
      // String stateName = locationInfo.get("name").stringValue();
      this.testingLocations.put(locationId, locationInfo);

      // this.stateLocations.put(stateId, locationInfo);
      // this.stateLocations.put(stateName, locationInfo);
      // System.out.println(locationInfo);
    });

  
  /**
   * Standard startup method called automatically when WebAgent is created
   */
  @Override
  public void didStart() {
    
    System.out.println("Aggregation Agent started");
  }

  private void getTestScoresByState() {
    // create record which will tell apiRequestAgent where to get data and where to put the result
    Record apiRequestInfo = Record.create()
      .slot("targetHost", "warp://127.0.0.1:9001")
      .slot("targetAgent", "/aggregation")
      .slot("targetLane", "receiveStateTestScores")
      .slot("apiUrl", "https://covidtracking.com/api/states");

    // send command to apiRequestAgent to fetch data
    command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse(String.format("/apiRequestAgent/covidtracking/testScoresByState")), Uri.parse("makeRequest"), apiRequestInfo);    
  }    

}