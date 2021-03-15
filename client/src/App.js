import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";

import { Home, NoMatch, Room } from './pages'
import { Container } from './components'

function App() {

  return (
    <Container>
      <Router>
        <Switch>
          <Route exact path="/">
            <Home />
          </Route>
          <Route path="/room/:roomId">
            <Room />
          </Route>
          <Route path="*">
            <NoMatch />
          </Route>
        </Switch>
      </Router>
    </Container>
  );
}

export default App;
