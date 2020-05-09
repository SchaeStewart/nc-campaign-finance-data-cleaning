import React from 'react';
import './App.css';
import {Container, Row, Col, Button} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory from 'react-bootstrap-table2-paginator';

function App() {
  const columns = [{
    dataField: 'id',
    text: 'Contribution ID'
  }, {
    dataField: 'fname',
    text: 'First Name'
  }, {
    dataField: 'lname',
    text: 'Last Name'
  }, {
    dataField: 'address',
    text: 'Address'
  }];
  
  const selectRow = {
    mode: 'checkbox',
    clickToSelect: true
  };

  // TODO Get a list contributions that need to be verified from API endpoint
  let contributions = [{
    'id': 0,
    'fname': 'John',
    'lname': 'Smith',
    'address': 'address'
  }];  

  return (
    <Container>
      <Row>
        <Col>
          <h1 className="text-center">Campaign Finance Data Cleaning</h1>
        </Col>
      </Row>
      <Row>
        <Col>
          <p className="text-center">Select all contributions that come from the same donor</p>
        </Col>
      </Row>
      <Row>
        <Col>
          <BootstrapTable
            keyField='id'
            data={ contributions }
            columns={ columns }
            selectRow={ selectRow }
            pagination={ paginationFactory() }
          />
        </Col>
      </Row>
      <Button className="float-right" variant="primary">Submit</Button>
    </Container>
  );
}

export default App;
