import React from 'react';
import { VideoContext } from '../../components/VideoProvider';

// import { styled } from '@material-ui/core/styles';

// const Container = styled('div')(({ theme }) => {

//   return {
//     position: 'relative',
//     height: '100%',
//     background: 'blue',
//    };
// });

class Map extends React.Component {

	componentDidMount() {

 		const script = document.createElement("script");
	    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js";
  		document.head.appendChild(script);


 		const css = document.createElement("link");
	    css.rel = "stylesheet";
	 	css.href = "/class.css";
  		document.head.appendChild(css);

 		const bootstrap = document.createElement("link");
	    bootstrap.rel = "stylesheet";
	 	bootstrap.href = "https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css";
	 	bootstrap.integrity = "sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2";
	 	bootstrap.crossOrigin="anonymous";
  		document.head.appendChild(bootstrap);


 		const bootstrapScript = document.createElement("script");
	 	bootstrapScript.src = "https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.bundle.min.js";
	 	bootstrapScript.integrity = "sha384-ho+j7jyWK8fNQe+A12Hb8AhRq26LrZ/JpcUGGOn+Y7RsweNrtN/tE3MoK7ZeZDyx";
	 	bootstrapScript.crossOrigin="anonymous";
  		document.head.appendChild(bootstrapScript);



	
 		const script2 = document.createElement("script");
	    script2.src = "/script.js";
	 	// script2.async = true;
  		document.head.appendChild(script2);


  		var Video = require('twilio-video');

		var localDataTrack = new Video.LocalDataTrack();
		window.addEventListener('mousemove', function(event) {
		  console.log(event)
		  localDataTrack.send(JSON.stringify({
		    x: event.clientX,
		    y: event.clientY
		  }));
		});

		window.twilioRoom.localParticipant.publishTrack(localDataTrack, {priority: 'high'})

	}


	render() {
		return  <div><div id="map" style={{background: "blue"}}>
				    </div>

				    <div id="pane" className="my-auto mx-auto">
				        <img id="box" src="/img/0.jpg" style={{ position: "absolute" }}></img>
				        <img id="box2" src="/img/0.jpg" style={{ position: "absolute" }}></img>
				    </div></div>
	}
}

export default Map;
