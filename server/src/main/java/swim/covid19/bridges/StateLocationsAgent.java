package swim.covid.bridges;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;

import swim.api.ref.SwimRef;
import swim.codec.Utf8;
import swim.api.SwimLane;
import swim.api.agent.AbstractAgent;
import swim.api.lane.CommandLane;
import swim.api.lane.ValueLane;
import swim.api.lane.MapLane;
import swim.concurrent.TimerRef;
import swim.structure.Value;
import swim.structure.Record;
import swim.structure.Text;
import swim.util.Cursor;
import swim.uri.Uri;
import swim.json.Json;
import swim.structure.Item;
import swim.structure.Value;
import swim.covid.configUtil.ConfigEnv;
import swim.covid.agents.DataImportAgent;

/**
 * The State Agent holds all the values for each State Vector returned by the
 * OpenSky API. One startup the webAgent will create a timer which checks the
 * last update time and closes the agent if the last update is older then 15
 * seconds.
 */
public class StateLocationsAgent extends DataImportAgent {


    private Value config = ConfigEnv.config;

    @SwimLane("syncApp")
    public CommandLane<Value> syncAppCommand = this.<Value>commandLane()
        .onCommand((Value newVectorRecord) -> {
            this.processCsvData();

        });      

    /**
    * Standard startup method called automatically when WebAgent is created
    */
    @Override
    public void didStart() {
        super.didStart();

        this.initialize(config, "stateCenters");
    }    

    /**
     * read and parse csv file
     */
    @Override
    public void readCsvFile() {
        super.readCsvFile(); // let base class do the actual file read
        this.processCsvData(); // process the results and make it useful data
    }

    /**
     * parse each record in the csvData map lane
     */
    public void processCsvData() {
        Integer locationCount = 0;

        // read and process each row of data
        for(Integer i=0; i < this.csvData.size(); i++) {
            Record rowItem = this.csvData.get(i);

            command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/aggregation"), Uri.parse("addStateLocation"), rowItem);

            locationCount++;
   
        }

        // log results
        String logMsg = "Found " + locationCount.toString() + " state locations";
        System.out.println(logMsg);
        // command(Uri.parse("/simulator"), Uri.parse("addJavaLog"), Value.fromObject(logMsg));
        command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/aggregation"), Uri.parse("requestTestScores"), Value.absent());
    }

}