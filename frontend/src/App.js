import React from 'react';
import './App.css';
import axios from 'axios';
import {Container, Row, Col, Button} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory from 'react-bootstrap-table2-paginator';

// Define columns here
// dataField should be the name of the desired field as specified by the API
const columns = [
  {
    dataField: 'name',
    text: 'Name'
  }, {
    dataField: 'street_line_1',
    text: 'Street Address'
  }, {
    dataField: 'city',
    text: 'City'
  }, {
    dataField: 'zip_code',
    text: 'Zipcode'
  }
];

const selectRow = {
  mode: 'checkbox',
  clickToSelect: true, // enables clicking the row to select the item
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      contributions: []
    }
  }

  // gets the uuids from the selected rows and sends a POST request to the API
  submitData = () => {
    let uuids = this.table.selectionContext.selected; // we bind this.table in the ref attribute of the BootstrapTable element below
    axios.post('/contributions/clean', {
      data: uuids
    })
  }

  // makes a request to get a set of matched contributions and updates the state
  getContributions = async () => {
    axios.get('/contributions/raw').then((response) => {
      this.setState({
        contributions: response.data.data
      });
    });
  }

  componentDidMount() {
    this.getContributions();
  }

  render() {
    return (
      <Container>
        <Row>
          <Col>
            <h1 className='text-center'>Campaign Finance Data Cleaning</h1>
          </Col>
        </Row>
        <Row>
          <Col>
            <p className='text-center'>Select all contributions that come from the same donor</p>
          </Col>
        </Row>
        <Row>
          <Col>
            <BootstrapTable
              ref={ t => this.table = t }
              keyField='id'
              data={ this.state.contributions }
              columns={ columns }
              selectRow={ selectRow }
              pagination={ paginationFactory() }
            />
          </Col>
        </Row>
        <Button className='float-right' variant='primary' onClick={ this.submitData }>Submit</Button>
      </Container>
    );
  }
}

export default App;
