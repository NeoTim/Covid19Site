package swim.covid;

import swim.api.SwimRoute;
import swim.api.agent.AgentRoute;
import swim.api.plane.AbstractPlane;
import swim.api.space.Space;
import swim.client.ClientRuntime;
import swim.kernel.Kernel;
import swim.server.ServerLoader;
import swim.structure.Value;
import swim.uri.Uri;
import swim.covid.agents.*;
import swim.covid.bridges.*;
import swim.covid.ui.*;
import swim.covid.configUtil.*;



/**
  The ApplicationPlane is the top level of the app.
  This Swim Plane defines the routes to each WebAgent
 */
public class ApplicationPlane extends AbstractPlane {

  @SwimRoute("/aggregation")
  AgentRoute<AggregationAgent> aggregationAgent;

  @SwimRoute("/config")
  AgentRoute<ConfigAgent> configAgent;

  @SwimRoute("/apiRequestAgent/:id")
  AgentRoute<ApiRequestAgent> apiRequestAgentById;

  @SwimRoute("/apiRequestAgent/:type/:id")
  AgentRoute<ApiRequestAgent> apiRequestAgentByType;

  @SwimRoute("/apiRequestAgent/:type/:agency/:id")
  AgentRoute<ApiRequestAgent> apiRequestAgentByAgency;

  @SwimRoute("/bridge/stateLocations")
  AgentRoute<StateLocationsAgent> stateLocationsAgent;

  @SwimRoute("/bridge/testingLocations")
  AgentRoute<TestingLocationsAgent> testingLocationsAgent;

  
  /**
   * The LayoutManager Agent manages the list of available layout templates,
   * loads existing templates on startup and the add/remove of templates
   */
  @SwimRoute("/layoutManager")
  AgentRoute<LayoutsManagerAgent> layoutManager;

  /**
   * The Layout Agent hold the data for an individual layout template
   */
  @SwimRoute("/layout/:id")
  AgentRoute<LayoutAgent> layoutAgent;

  public static void main(String[] args) throws InterruptedException {

    ConfigEnv.loadConfig();

    final Kernel kernel = ServerLoader.loadServer();
    final Space space = (Space) kernel.getSpace("covid");

    kernel.start();
    System.out.println("Running Covid19 Application plane...");
    kernel.run();
    
    space.command(Uri.parse("/bridge/stateLocations"), Uri.parse("start"), Value.absent());
    space.command(Uri.parse("/bridge/testingLocations"), Uri.parse("start"), Value.absent());
    space.command(Uri.parse("/layoutManager"), Uri.parse("start"), Value.absent());
    space.command(Uri.parse("/aggregation"), Uri.parse("updateConfig"), ConfigEnv.config);

    
    
  }
}
