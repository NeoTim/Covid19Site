package swim.covid.bridges;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.util.Iterator;

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
public class TestingLocationsAgent extends DataImportAgent {


    private Value config = ConfigEnv.config;
    private String rawFileContent = "";
    public Value jsonData = Value.absent();

    @SwimLane("syncApp")
    public CommandLane<Value> syncAppCommand = this.<Value>commandLane()
        .onCommand((Value newVectorRecord) -> {
            this.readCsvFile();

        });      

    /**
    * Standard startup method called automatically when WebAgent is created
    */
    @Override
    public void didStart() {
        super.didStart();

        this.initialize(config, "testingLocations");
    }    

    /**
     * read and parse csv file
     */
    @Override
    public void readCsvFile() {
        // super.readCsvFile(); // let base class do the actual file read
        // this.processCsvData(); // process the results and make it useful data
        this.loadJson();
    }

    public void processJsonData(Value jsonData) {
        System.out.println("read json results");
        int rowCount = 0;
        final Iterator<Item> rows = jsonData.iterator();
        while(rows.hasNext()) {
          Record currentRow = Record.of(rows.next());
          command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/aggregation"), Uri.parse("addTestingLocation"), currentRow);
          rowCount++;
        }
        System.out.print("json rows:");
        System.out.println(rowCount);
    }

    public void loadJson() {
        if(this.bufferFileContents(this.absolutePathIn)) {
            try {
                System.out.println("parse json config file");
                // System.out.println(rawFileContent);
                jsonData = Json.parse(rawFileContent);
                processJsonData(jsonData);
            } catch(Exception ex) {
                System.out.println("error parsing json config file");
                // System.out.println(ex);
            }
        }
        
    }
    
    private boolean bufferFileContents(String absolutePathIn) {
        Integer lineCount = 0;
        System.out.println("read config @ " + absolutePathIn);
        try(BufferedReader bufferedReader = new BufferedReader(new FileReader(absolutePathIn))) {  
            String line = bufferedReader.readLine();
            rawFileContent = line;
            while(line != null) {
                line = bufferedReader.readLine();
                if(line != null && line != "null") {
                rawFileContent += line;
                lineCount++;
                }
            } 
            System.out.println("Read " + lineCount.toString() + " lines of " + absolutePathIn);
            return true;
        } catch (FileNotFoundException e) {
            System.out.println("File not found:" + absolutePathIn);
            return false;
        } catch (IOException e) {
            System.out.println("error reading file");
            return false;
        }    
    }  
}