import React from 'react';
import './App.css';
import axios from 'axios';
import {Container, Row, Col, Button, Modal, Spinner} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import BootstrapTable from 'react-bootstrap-table-next';
import 'react-bootstrap-table2-paginator/dist/react-bootstrap-table2-paginator.min.css';
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

const paginationOpts = {
  sizePerPage: 25,
  sizePerPageList: [
    {
      text: '10', value: 10
    }, {
      text: '25', value: 25
    }, {
      text: '50', value: 25
    }, {
      text: '100', value: 100
    }
  ]
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      contributions: [],
      showModal: false,
      modalTitle: "",
      modalBody: "",
      loading: true
    }
  }

  // gets the uuids from the selected rows and sends a POST request to the API
  submitData = () => {
    let uuids = this.table.selectionContext.selected; // we bind this.table in the ref attribute of the BootstrapTable element below
    if(uuids.length === 0) {
      this.setState({
        showModal: true,
        modalTitle: "No selection made",
        modalBody: "Please select at least one entry before pressing submit."
      });
    }
    else {
      axios.post('/contributions/clean', {
        data: uuids
      })
      .then((response) => {
        if(response.status === 200) {
          this.setState({
            showModal: true,
            modalTitle: "Success",
            modalBody: "Your submission has been processed successfully!"
          });
          this.getContributions();
        }
        else {
          this.setState({
            showModal: true,
            modalTitle: "Error",
            modalBody: "There was an error with your submission. Please try again later or refresh for a new set of contributions."
          });
        }
      });
    }
  }

  // makes a request to get a set of matched contributions and updates the state
  getContributions = async () => {
    this.setState({
      loading: true
    });
    axios.get('/contributions/raw').then((response) => {
      this.setState({
        contributions: response.data.data,
        loading: false
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
            {this.state.loading ? 
              <Col className='text-center'>
                <Spinner animation="border" variant="primary" role="status">
                  <span className="sr-only">Loading...</span>
                </Spinner>
              </Col>
              :
              <Col>
                <BootstrapTable
                  ref={ t => this.table = t }
                  keyField='id'
                  data={ this.state.contributions }
                  columns={ columns }
                  selectRow={ selectRow }
                  pagination={ paginationFactory(paginationOpts) }
                />
                <Button className='float-right' variant='primary' onClick={ this.submitData }>Submit</Button>
              </Col>
            }
        </Row>
        <Modal show={ this.state.showModal } onHide={ () => this.setState({showModal: false}) }>
          <Modal.Header closeButton>
            <Modal.Title>{ this.state.modalTitle }</Modal.Title>
          </Modal.Header>
          <Modal.Body>{ this.state.modalBody }</Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={ () => this.setState({showModal: false}) }>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    );
  }
}

export default App;
