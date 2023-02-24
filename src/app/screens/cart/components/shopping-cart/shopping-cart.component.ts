import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/screens/auth/services/auth.service';
import { CartService } from '../../sertvies/cart.service';

@Component({
  selector: 'app-shopping-cart',
  templateUrl: './shopping-cart.component.html',
  styleUrls: ['./shopping-cart.component.scss']
})
export class ShoppingCartComponent implements OnInit {
  notuserdataAdded=false
  paymentFaild = false
  paymenSuccess = false
  profileData
  notuserdataSubmited = false
  checkoutLoading = false
  notAvailableitems = ''
  chosenPayment = '1'
  addressRequired = 0
  submitedCheckout = false
  loading = true
  cartitems: any[] = []
  showDeleteCArtitem = -1
  showpopup = -1
  total = 0
  shipingCharge = 0
  promoCodeLoading = false
  promocodedisabled = false
  addressloading = false
  areas: any[] = []
  addresses: any[] = []
  addAddressPopup = false
  addressForm: FormGroup
  notUserDataForm: FormGroup
  submited = false
  userid = null
  selectedAddress = null
  promocode = ''
  notUserData = null
  notUserDataPopup = false
  firstTimeAddress = true
  addAddress(formvalue: any) {
    this.submited = true
    if (this.addressForm.valid) {
      for (let i = 0; i < this.areas.length; i++) {
        this.areas[i]?.areas.forEach((item: any) => {
          if (item?.id == formvalue.area_id) {
            formvalue.area_name = item?.name
          }
        })
      }
      if (!!localStorage.getItem('joinToken')) {
        this.addressloading = true
        this.authservice.addAddress(formvalue).subscribe(
          (res: any) => {
            this.addressloading = false
            console.log(res)
            if (res?.code == 1) {
              this.authservice.getAddress(this.userid)
              this.toastr.success(res?.message);
              this.firstTimeAddress = false
              this.addAddressPopup = false
            } else {

            }
          }
        )
      } else {
        formvalue.id = this.addresses?.length + 1
        this.addresses.push(formvalue)
        this.selectedAddress = this.addresses[this.addresses.length - 1]
        this.addAddressPopup = false
      }

    }
  }
  addnotuserData() {
    this.notuserdataSubmited = true
    if (this.notUserDataForm.valid) {
      localStorage.setItem('not_user_data', JSON.stringify(this.notUserDataForm.value))
      this.notUserDataPopup = false
      this.notuserdataAdded=true
      this.checkout()
    }
  }
  constructor(private router: Router,
    private activatedRoute: ActivatedRoute,
    private datePipe: DatePipe,
    private toastr: ToastrService,
    private fb: FormBuilder,
    public authservice: AuthService,
    private cartService: CartService) { }
  pathcharea() {
    this.addressForm.patchValue({
      area_id: ""
    })
  }
  ngOnInit(): void {
    this.notUserData = JSON.parse(localStorage.getItem('not_user_data'))
    let cart = localStorage.getItem('joincart')
    if (cart) {
      this.cartitems = JSON.parse(cart)
    }
    if (this.cartitems?.length) {
      this.cartitems.map(i => i.disc = 0)
    }
    this.getTotal()
    setTimeout(() => {
      this.loading = false
    }, 1000)
    this.addressForm = this.fb.group({
      title: ['', Validators.required],
      area_id: ['', Validators.required],
      block: ['', Validators.required],
      street: ['', Validators.required],
      building: ['', Validators.required],
      floor: [''],
      apartment: [''],
      additional_direction: [''],
      avenue: ['']
    })
    this.notUserDataForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', [Validators.required,
        Validators.pattern(/^[569٥٦٩][\u0660-\u0669]{7}$|^[569٥٦٩]\d{7}$/)]],
      email: ['', [Validators.required,Validators.email,Validators.pattern(/.com$/)]],
    })
    this.authservice.areas.subscribe(
      (res: any) => {
        this.areas = res
      }
    )
    if (!!localStorage.getItem('joinToken')) {
      this.authservice.userProfile.subscribe(
        (res: any) => {
          if (res) {

            this.profileData = res
            this.userid = res?.user_id
            this.authservice.getAddress(res?.user_id)
            this.authservice.addresses.subscribe(
              (addresses: any) => {
                console.log(addresses)
                if (Array.isArray(addresses)) {
                  this.addresses = addresses
                  if (!this.firstTimeAddress && addresses?.length) {
                    this.selectedAddress = this.addresses[this.addresses?.length - 1]
                  }
                }
              }
            )
          }
        }
      )
    }

    this.activatedRoute.queryParamMap.subscribe((res: any) => {
      if (this.cartitems?.length && res?.params?.type == 0) {
        this.paymentFaild = true
      }
      if (this.cartitems?.length && res?.params?.type == 1) {

        this.cartitems = this.cartitems.filter(i => i.invoice_id)
        if (this.cartitems?.length) {
          this.loading = true
          this.cartService.get_details(this.cartitems[0]?.invoice_id).subscribe(
            (res: any) => {
              console.log(res)
              this.loading = false
              if (res?.status == 'Pending') {
                // this.router.navigate(['/'])
              } else if (res?.status == 'Paid') {
                this.paymenSuccess = true
                this.createBooking()
              }
            }
          )
        }

      }
    })
    console.log(this.cartitems)

  }

  getTotal() {
    if (this.cartitems?.length) {
      this.addressRequired = 0
      this.total = 0
      this.shipingCharge = 0
      let productCharg = []
      let activityCharg = []
      this.cartitems.forEach(i => {
        if (i?.selectedLocation?.price_type != 'PAY_AT_PLACE') {
          if (i?.cstmtype == 1 && i?.type == 1) {
            if (i?.disc == 0) {
              if (!i?.hideMembers) {
                this.total += i?.selectedLocation.price * i?.selectedMembers?.length
              } else {
                this.total += i?.selectedLocation.price * 1
              }
            } else {
              this.total += i?.disc
            }
          } else if (i?.cstmtype == 1 && i?.type == 0) {
            if (i?.disc == 0) {
              console.log(Number(i?.selectedLocation.price) * (i?.notUserMembersCount))
              this.total += Number(i?.selectedLocation.price) * Number(i?.notUserMembersCount)
              console.log(this.total)
            } else {
              this.total += i?.disc
              console.log(i?.disc)
            }

          }
        }

        if (i?.cstmtype == 2) {
          this.total += i?.price * i?.countToBuy
          if (!productCharg.some(item => i.id == item.id)) productCharg.push(i)
        }
        if (i?.cstmtype == 1 && i?.shipping_required == '1') activityCharg.push(i)

      })
      if (productCharg?.length) {
        productCharg.forEach(product => {
          this.shipingCharge += Number(product?.shipping_charge)
        })
        this.addressRequired = 1
      }
      if (activityCharg?.length) {
        this.shipingCharge += Number(activityCharg[0]?.club_details?.shipping_charge)
        this.addressRequired = 1
      }
    }
    console.log(this.total)
  }
  deleteCartItem() {
    this.cartitems.splice(this.showDeleteCArtitem, 1)
    localStorage.setItem('joincart', JSON.stringify(this.cartitems))
    this.showDeleteCArtitem = -1
    this.getTotal()
  }
  routeToDetailsPage(item: any) {
    if (item?.cstmtype == 2) {
      this.router.navigate([`/product/${item?.id}`])
    } else if (item?.cstmtype == 1) {
      this.router.navigate([`/activity/${item?.id}`])
    }
  }
  plusone(index: any) {
    if (this.cartitems[index]?.selectedSize?.qty) {
      if (this.cartitems[index]?.countToBuy < this.cartitems[index]?.selectedSize?.qty) {
        this.cartitems[index].countToBuy += 1
        localStorage.setItem('joincart', JSON.stringify(this.cartitems))
      }
    } else {
      if (this.cartitems[index]?.countToBuy < this.cartitems[index]?.qty) {
        this.cartitems[index].countToBuy += 1
        localStorage.setItem('joincart', JSON.stringify(this.cartitems))
      }
    }
    this.getTotal()
  }
  minusone(index: any) {
    if (this.cartitems[index]?.countToBuy == 1) {
      this.showDeleteCArtitem = index
    } else {
      if (this.cartitems[index]?.countToBuy > 0) {
        this.cartitems[index].countToBuy -= 1
        localStorage.setItem('joincart', JSON.stringify(this.cartitems))
      }
    }
    this.getTotal()
  }
  get lang() {
    return localStorage.getItem('lang') || 'en'
  }
  selectedDataFromPopup(index, event) {
    this.cartitems[index].selectedMembers = event.selectedMembers
    this.cartitems[index].selectedLocation = event.selectedLocation,
      this.cartitems[index].selectedDate = event.selectedDate
    this.cartitems[index].selectedTime = event.selectedTime
    this.cartitems[index].cstmtype = 1
    this.cartitems[index].type = event.type
    this.cartitems[index].notUserMembersCount = event.notUserMembersCount
    localStorage.setItem('joincart', JSON.stringify(this.cartitems))
    this.showpopup = -1
    this.getTotal()
  }
  getpromoCode(promocode: string) {

    if (!this.promocodedisabled) {
      this.promoCodeLoading = true
      this.promocode = promocode
      this.cartService.getPromoCode().subscribe(
        res => {
          this.promoCodeLoading = false
          if (Array.isArray(res)) {
            let selectedPromoCode = res.find(i => i.code.toLowerCase() == promocode.toLowerCase())
            if (!selectedPromoCode) {
              this.toastr.error(localStorage.getItem('lang') == 'ar' ? 'لا يمكن تطبيق الخصم' : 'Cannot apply discount on items');
            } else {
              let today = new Date()
              let item = selectedPromoCode
              let from = new Date(item?.date_from)
              let to = new Date(item?.date_to)
              if (item?.status == 'ACTIVE') {
                if (
                  (this.datePipe.transform(from, 'MM-dd-yyy') == this.datePipe.transform(today, 'MM-dd-yyy'))
                  ||
                  (this.datePipe.transform(to, 'MM-dd-yyy') == this.datePipe.transform(today, 'MM-dd-yyy'))
                  ||
                  (today > from && today < to)
                ) {
                  console.log(selectedPromoCode)
                  this.cartitems.forEach(item => {
                    if (item?.cstmtype == 1 && selectedPromoCode?.applied_on == 'all') {
                      if (selectedPromoCode?.type == 'Percentage') {
                        let Percentage = selectedPromoCode?.value / 100
                        if (item?.type == 1) {
                          let currentPrice = item?.hideMembers ? item?.selectedLocation.price * 1 : item?.selectedLocation.price * item?.selectedMembers?.length
                          item.disc = (currentPrice) - (currentPrice * Percentage)
                        } else if (item?.type == 0) {
                          let currentPrice = item?.selectedLocation.price * item?.notUserMembersCount
                          item.disc = (currentPrice) - (currentPrice * Percentage)
                        }
                      } else if (selectedPromoCode?.type == 'Fixed') {
                        if (item?.type == 1) {
                          let currentPrice = item?.hideMembers ? item?.selectedLocation.price * 1 : item?.selectedLocation.price * item?.selectedMembers?.length
                          item.disc = (currentPrice) - selectedPromoCode?.value
                        } else if (item?.type == 0) {
                          let currentPrice = item?.selectedLocation.price * item?.notUserMembersCount
                          item.disc = (currentPrice) - selectedPromoCode?.value
                        }
                      }
                      // end all case
                    } else if (item?.cstmtype == 1 && selectedPromoCode?.applied_on == 'club' &&
                      item?.club_id == selectedPromoCode?.club_activity_id) {
                      if (selectedPromoCode?.type == 'Percentage') {
                        let Percentage = selectedPromoCode?.value / 100
                        if (item?.type == 1) {
                          let currentPrice = item?.hideMembers ? item?.selectedLocation.price * 1 : item?.selectedLocation.price * item?.selectedMembers?.length
                          item.disc = (currentPrice) - (currentPrice * Percentage)
                        } else if (item?.type == 0) {
                          let currentPrice = item?.selectedLocation.price * item?.notUserMembersCount
                          item.disc = (currentPrice) - (currentPrice * Percentage)
                        }
                      } else if (selectedPromoCode?.type == 'Fixed') {
                        if (item?.type == 1) {
                          let currentPrice = item?.hideMembers ? item?.selectedLocation.price * 1 : item?.selectedLocation.price * item?.selectedMembers?.length
                          item.disc = (currentPrice) - selectedPromoCode?.value
                        } else if (item?.type == 0) {
                          let currentPrice = item?.selectedLocation.price * item?.notUserMembersCount
                          item.disc = (currentPrice) - selectedPromoCode?.value
                        }
                      }
                      // end clup case
                    } else if (item?.cstmtype == 1 && selectedPromoCode?.applied_on == 'activity' &&
                      item?.id == selectedPromoCode?.club_activity_id) {
                      if (selectedPromoCode?.type == 'Percentage') {
                        let Percentage = selectedPromoCode?.value / 100
                        if (item?.type == 1) {
                          let currentPrice = item?.hideMembers ? item?.selectedLocation.price * 1 : item?.selectedLocation.price * item?.selectedMembers?.length
                          item.disc = (currentPrice) - (currentPrice * Percentage)
                        } else if (item?.type == 0) {
                          let currentPrice = item?.selectedLocation.price * item?.notUserMembersCount
                          item.disc = (currentPrice) - (currentPrice * Percentage)
                        }
                      } else if (selectedPromoCode?.type == 'Fixed') {
                        if (item?.type == 1) {
                          let currentPrice = item?.hideMembers ? item?.selectedLocation.price * 1 : item?.selectedLocation.price * item?.selectedMembers?.length
                          item.disc = (currentPrice) - selectedPromoCode?.value
                        } else if (item?.type == 0) {
                          let currentPrice = item?.selectedLocation.price * item?.notUserMembersCount
                          item.disc = (currentPrice) - selectedPromoCode?.value
                        }
                      }
                      // end activity case
                    }
                    this.getTotal()
                  //  this.promocodedisabled = true
                  })
                } else {
                  console.log('one')
                  this.toastr.error(localStorage.getItem('lang') == 'ar' ? 'لا يمكن تطبيق الخصم' : 'Cannot apply discount on items');
                }
              } else {
                console.log('two')
                this.toastr.error(localStorage.getItem('lang') == 'ar' ? 'لا يمكن تطبيق الخصم' : 'Cannot apply discount on items');
              }
            }
          }
          localStorage.setItem('joincart', JSON.stringify(this.cartitems))
          console.log(this.cartitems)
        }
      )
    }
    this.cartitems.map(i => {
      if(i?.disc<0) i.disc=0
    })
  }
  checkPromoCodeInputLength(value: string) {
    let activites = this.cartitems.filter(i => i?.cstmtype == 1)
    if (value.trim().length == 0 || !activites?.length) return true
    else return false
  }
  createBooking() {
    console.log(this.total, (this.shipingCharge))
    let requestBody = {
      activity_data: [],
      child_id: [],
      booking_txn: 0,
      payment_method: 'PAYMENT_GATEWAY',
      total: this.total + this.shipingCharge,
      booking_session: [],
      shipping_charge: this.shipingCharge,
      address_id: 0,
      // device_type:'W',
      // device_token:'_',
      store: [],
      guset_child: [],
      fname: '',
      lname: '',
      age: '',
      mobile: '',
      email: '',
      title: '',
      area_name: '',
      area_id: Number(this.selectedAddress?.area_id) || 0,
      block: '',
      street: '',
      building: '',
      floor: '',
      apartment: '',
      order_id: 0,
      SupplierValue: 0,
      SupplierCode: 0
    }

    if (this.cartitems?.length) {
      for (let i = 0; i < this.cartitems?.length; i++) {
        requestBody.booking_txn = this.cartitems[0]?.invoice_id || ''
        requestBody.order_id = this.cartitems[0]?.order_id || ''
        requestBody.SupplierValue = this.cartitems[0]?.SupplierValue || ''
        requestBody.SupplierCode = Number(this.cartitems[0].SupplierCode)
        requestBody.address_id = Number(this.cartitems[0].selectedAddress) || 0

        requestBody.fname = this.cartitems[0].fname
        requestBody.lname = this.cartitems[0].lname
        requestBody.mobile = this.cartitems[0].mobile
        requestBody.email = this.cartitems[0].email
        requestBody.title = this.cartitems[0].title
        requestBody.area_name = this.cartitems[0].area_name
        requestBody.area_id = this.cartitems[0].area_id
        requestBody.block = this.cartitems[0].block
        requestBody.street = this.cartitems[0].street
        requestBody.building = this.cartitems[0].building
        requestBody.floor = this.cartitems[0].floor
        requestBody.apartment = this.cartitems[0].apartment





        if (this.cartitems[i]?.cstmtype == 1) {

          let activity_data: any = {}
          activity_data.frequency = this.cartitems[i]?.selectedLocation?.frequency
          activity_data.promo_code = this.promocode
          activity_data.days_for_activity = this.cartitems[i]?.selectedLocation?.days_for_activity
          activity_data.branch_id = this.cartitems[i]?.selectedLocation?.branch_id
          activity_data.max_seats = this.cartitems[i]?.selectedLocation?.max_seats
          activity_data.selected_date =  this.datePipe.transform(this.cartitems[i]?.selectedDate, 'yyy-MM-dd')
          activity_data.activity_id = String(this.cartitems[i]?.id)
          // not available value from down
          activity_data.booking_status = 'SUCCESS'
          activity_data.booking_amount_type = this.cartitems[i]?.selectedLocation?.price_type
          if (true) {
            if (this.cartitems[i]?.cstmtype == 1 && this.cartitems[i]?.type == 1) {
              if (this.cartitems[i]?.disc == 0) {
                activity_data.booking_discount = 0
                if (!this.cartitems[i]?.hideMembers) {
                  activity_data.booking_amount = this.cartitems[i]?.selectedLocation.price * this.cartitems[i]?.selectedMembers?.length
                  activity_data.booking_payment = this.cartitems[i]?.selectedLocation.price * this.cartitems[i]?.selectedMembers?.length
                } else {
                  activity_data.booking_amount = this.cartitems[i]?.selectedLocation.price * 1
                  activity_data.booking_payment = this.cartitems[i]?.selectedLocation.price * 1
                }
              } else {
                activity_data.booking_amount = this.cartitems[i]?.selectedLocation.price * this.cartitems[i]?.selectedMembers?.length
                activity_data.booking_discount = (this.cartitems[i]?.selectedLocation.price * this.cartitems[i]?.selectedMembers?.length) - this.cartitems[i]?.disc
                activity_data.booking_payment = this.cartitems[i]?.disc
              }
          
            } else if (this.cartitems[i]?.cstmtype == 1 && this.cartitems[i]?.type == 0) {
              if (this.cartitems[i]?.disc == 0) {
                activity_data.booking_amount = Number(this.cartitems[i]?.selectedLocation.price) * Number(this.cartitems[i]?.notUserMembersCount)
                activity_data.booking_discount = 0
                activity_data.booking_payment = Number(this.cartitems[i]?.selectedLocation.price) * Number(this.cartitems[i]?.notUserMembersCount)
              } else {
                this.total += this.cartitems[i]?.disc
                activity_data.booking_amount = Number(this.cartitems[i]?.selectedLocation.price) * Number(this.cartitems[i]?.notUserMembersCount)
                activity_data.booking_payment = this.cartitems[i]?.disc
                activity_data.booking_discount = (Number(this.cartitems[i]?.selectedLocation.price) * Number(this.cartitems[i]?.notUserMembersCount)) - this.cartitems[i]?.disc

              }

       
            }
          }

          activity_data.number_of_child = !!localStorage.getItem('joinToken') ? 0 : this.cartitems[i]?.notUserMembersCount
          activity_data.booked_seats = this.cartitems[i]?.selectedMembers?.length||0, 
            activity_data.booking_amount = Number(activity_data.booking_amount).toFixed(3)
            console.log()
          activity_data.booking_payment = Number(activity_data.booking_payment).toFixed(3)
          activity_data.booking_discount = Number(activity_data.booking_discount).toFixed(3)
          activity_data.shipping_charge = this.cartitems[i]?.club_details?.shipping_charge
          requestBody.activity_data.push(activity_data)

          //  end activity_data
          if (this.cartitems[i]?.selectedMembers?.length) {
            this.cartitems[i]?.selectedMembers.forEach(element => {
              let child_id: any = {}
              child_id.branch_id = this.cartitems[i]?.selectedLocation?.branch_id
              child_id.activity_id = String(this.cartitems[i]?.id)
              child_id.child_id = String(element?.child_id)
              requestBody.child_id.push(child_id)
              //  end child_id
              let booking_session: any = {};
              booking_session.branch_id = String(this.cartitems[i]?.selectedLocation?.branch_id)
              booking_session.no_of_session = '1'
              booking_session.from_time = this.cartitems[i]?.selectedTime?.from_time
              booking_session.to_time = this.cartitems[i]?.selectedTime?.to_time
              booking_session.club_activity_location_id = String(this.cartitems[i]?.selectedTime?.club_activity_location_id)
              booking_session.activity_id = String(this.cartitems[i]?.id)
              booking_session.child_id = String(element?.child_id)
              booking_session.booking_session = String(this.cartitems[i]?.selectedLocation?.id)
              booking_session.max_seats = String(this.cartitems[i]?.selectedLocation?.max_seats)
              booking_session.selected_date = this.datePipe.transform(this.cartitems[i]?.selectedDate, 'yyy-MM-dd')
              requestBody.booking_session.push(booking_session)
              // end booking_session
            });
          }
          if (!!localStorage.getItem('joinToken') == false && this.cartitems[i]?.notUserMembersCount) {
            for (let x = 0; x < this.cartitems[i]?.notUserMembersCount; x++) {
              let obj = {
                branch_id: this.cartitems[i]?.selectedLocation?.branch_id,
                activity_id: this.cartitems[i]?.id,
                gender: '',
                fullname: this.notUserData?.name || '',
                email: this.notUserData?.email || '',
                age: '',
                mobile: this.notUserData?.phone || '',
              }
              requestBody.guset_child.push(obj)
            }
          }
          //  end guest_child
        } else if (this.cartitems[i]?.cstmtype == 2) {
          let storeItem: any = {}
          storeItem.product_id = this.cartitems[i]?.id,
            storeItem.qty = this.cartitems[i]?.countToBuy,
            storeItem.color = this.cartitems[i]?.selectedColor?.id || '',
            storeItem.size = this.cartitems[i]?.selectedSize?.id || '',
            storeItem.booking_status = "SUCCESS",
            requestBody.store.push(storeItem)
          // end store
        }

      }
    }
    ////////////////////




    let formdata = new FormData()
    for (let i in requestBody) {
      formdata.append(i, JSON.stringify(requestBody[i]))
    }
    console.log(requestBody)
    this.cartService.creatBooking(formdata).subscribe(
      res => {
        if (res?.type == "SUCCESS") {
          this.toastr.success(localStorage.getItem('lang') == 'ar' ? 'تم تنفيذ طلبك بنجاح' : 'Your request has been successfully processed');
          if (!!localStorage.getItem('joinToken') == false) {
            this.cartService.notUserHistory = this.cartitems
          }
          localStorage.setItem('joincart', JSON.stringify([]))
          this.router.navigate(['/history'])
        }
      }
    )
  }
  checkAvailableSeats() {
    console.log(this.profileData?.fname || this.notUserData?.name)
    this.checkoutLoading = true
    let availableSeatsRequestBody = {
      activity_data: [],
      child_id: [],
      payment_method: 'PRICE',
      total: this.total + this.shipingCharge,
      booking_session: [],
      club_id: 0,
      store: [],
    }
    if (this.cartitems?.length) {
      for (let i = 0; i < this.cartitems?.length; i++) {
        availableSeatsRequestBody.club_id = Number(this.cartitems[i]?.club_id)
        if (this.cartitems[i]?.cstmtype == 1) {
          let activity_data: any = {}
          activity_data.frequency = this.cartitems[i]?.selectedLocation?.frequency
          activity_data.promo_code = this.promocode
          activity_data.days_for_activity = this.cartitems[i]?.selectedLocation?.days_for_activity
          activity_data.branch_id = this.cartitems[i]?.selectedLocation?.branch_id
          activity_data.max_seats = this.cartitems[i]?.selectedLocation?.max_seats
          activity_data.selected_date =  this.datePipe.transform(this.cartitems[i]?.selectedDate, 'yyy-MM-dd')
          activity_data.activity_id = String(this.cartitems[i]?.id)
          activity_data.booking_status = 'SUCCESS'
          activity_data.booking_amount_type = 'PRICE'
          activity_data.shipping_charge = this.cartitems[i]?.club_details?.shipping_charge
          activity_data.number_of_child =!!localStorage.getItem('joinToken') ? 0 : this.cartitems[i]?.notUserMembersCount,
          activity_data.booked_seats = this.cartitems[i]?.selectedMembers?.length||0
          if (true) {
            if (this.cartitems[i]?.cstmtype == 1 && this.cartitems[i]?.type == 1) {
              if (this.cartitems[i]?.disc == 0) {
                activity_data.booking_discount = 0
                if (!this.cartitems[i]?.hideMembers) {
                  activity_data.booking_amount = this.cartitems[i]?.selectedLocation.price * this.cartitems[i]?.selectedMembers?.length
                  activity_data.booking_payment = this.cartitems[i]?.selectedLocation.price * this.cartitems[i]?.selectedMembers?.length
                  console.log(this.cartitems[i]?.selectedLocation.price * this.cartitems[i]?.selectedMembers?.length)
                } else {
                  activity_data.booking_amount = this.cartitems[i]?.selectedLocation.price * 1
                  activity_data.booking_payment = this.cartitems[i]?.selectedLocation.price * 1
                }
              } else {
                activity_data.booking_amount = this.cartitems[i]?.selectedLocation.price * this.cartitems[i]?.selectedMembers?.length
                activity_data.booking_discount = (this.cartitems[i]?.selectedLocation.price * this.cartitems[i]?.selectedMembers?.length) - this.cartitems[i]?.disc
                activity_data.booking_payment = this.cartitems[i]?.disc
              }
            } else if (this.cartitems[i]?.cstmtype == 1 && this.cartitems[i]?.type == 0) {
              if (this.cartitems[i]?.disc == 0) {
                activity_data.booking_amount = Number(this.cartitems[i]?.selectedLocation.price) * Number(this.cartitems[i]?.notUserMembersCount)
                activity_data.booking_discount = 0
                activity_data.booking_payment = Number(this.cartitems[i]?.selectedLocation.price) * Number(this.cartitems[i]?.notUserMembersCount)
              } else {
                this.total += this.cartitems[i]?.disc
                activity_data.booking_amount = Number(this.cartitems[i]?.selectedLocation.price) * Number(this.cartitems[i]?.notUserMembersCount)
                activity_data.booking_payment = this.cartitems[i]?.disc
                activity_data.booking_discount = (Number(this.cartitems[i]?.selectedLocation.price) * Number(this.cartitems[i]?.notUserMembersCount)) - this.cartitems[i]?.disc

              }

              
            }
          }
          activity_data.booking_amount = Number(activity_data.booking_amount).toFixed(3)
          activity_data.booking_payment = Number(activity_data.booking_payment).toFixed(3)
          activity_data.booking_discount = Number(activity_data.booking_discount).toFixed(3)
          availableSeatsRequestBody.activity_data.push(activity_data)

          //////////// end activity_data

          if (this.cartitems[i]?.selectedMembers?.length) {
            this.cartitems[i]?.selectedMembers.forEach(element => {
              let child_id: any = {}
              child_id.branch_id = this.cartitems[i]?.selectedLocation?.branch_id
              child_id.activity_id = String(this.cartitems[i]?.id)
              child_id.child_id = String(element?.child_id)
              availableSeatsRequestBody.child_id.push(child_id)
              //////////// end child_id


              let booking_session: any = {};
              booking_session.branch_id = this.cartitems[i]?.selectedLocation?.branch_id
              booking_session.no_of_session = '1' 
              booking_session.from_time = this.cartitems[i]?.selectedTime?.from_time
              booking_session.to_time = this.cartitems[i]?.selectedTime?.to_time
              booking_session.club_activity_location_id = this.cartitems[i]?.selectedTime?.club_activity_location_id
              booking_session.activity_id = this.cartitems[i]?.id
              booking_session.child_id = element?.child_id
              booking_session.selected_date = this.datePipe.transform(this.cartitems[i]?.selectedDate, 'yyy-MM-dd')
              booking_session.max_seats = this.cartitems[i]?.selectedLocation?.max_seats
              booking_session.booking_session = String(this.cartitems[i]?.selectedLocation?.id)
              availableSeatsRequestBody.booking_session.push(booking_session)
              //////////// end booking_session



            });
          }

        } else if (this.cartitems[i]?.cstmtype == 2) {
          let storeItem: any = {}
          storeItem.type = "product"
          storeItem.product_id = this.cartitems[i]?.id,
            storeItem.qty = this.cartitems[i]?.countToBuy,
            storeItem.color = this.cartitems[i]?.selectedColor?.id || '',
            storeItem.size = this.cartitems[i]?.selectedSize?.id || '',
            storeItem.booking_status = "SUCCESS",
            storeItem.price = this.cartitems[i]?.price,
            storeItem.price_type = "PRICE",
            storeItem.booking_discount = "0.0",
            storeItem.promo_code = this.promocode
          availableSeatsRequestBody.store.push(storeItem)
        }

      }
    }
    let formdata = new FormData()
    for (let i in availableSeatsRequestBody) {
      formdata.append(i, JSON.stringify(availableSeatsRequestBody[i]))
    }
    this.cartService.checkAvailableSeats(formdata).subscribe(
      res => {
        console.log(res)
        if (res?.payload?.items && res?.type == 'SUCCESS') {
          this.notAvailableitems = res?.payload?.items
          this.checkoutLoading = false
        }
        else if (!res?.payload?.items && res?.type == 'SUCCESS') {
          this.notAvailableitems = ''
          this.cartitems.map(i => {
            i.SupplierValue = res?.payload?.SupplierValue,
              i.SupplierCode = res?.payload?.SupplierCode,
              i.order_id = res?.payload?.order_id
          })
          localStorage.setItem('joincart', JSON.stringify(this.cartitems))
          console.log(this.cartitems)
          if (!Number(this.total + this.shipingCharge)) {
            this.createBooking()
          } else {
            this.cartService.paymentRequest({
              "user_name": this.notUserData?.name || '',
              "user_phone": this.notUserData?.phone || '',
              "user_email": this.notUserData?.email || '',
              "amount": Number(this.total + this.shipingCharge),
            }).subscribe(
              response => {
                console.log(response)
                if (response?.message) {

                  this.cartitems.map(i => {
                    i.invoice_id = response?.invoice_id
                    i.selectedAddress = this.selectedAddress?.id
                    i.fname = this.profileData?.fname || this.notUserData?.name
                    i.lname = this.profileData?.lname || ''
                    i.mobile = this.profileData?.mobile || this.notUserData?.phone,
                      i.email = this.profileData?.email || this.notUserData?.email
                    i.title = this.selectedAddress?.title || ''
                    i.area_name = this.selectedAddress?.area_name || ''
                    i.area_id = Number(this.selectedAddress?.area_id) || 0
                    i.block = this.selectedAddress?.block || '',
                      i.street = this.selectedAddress?.street || '',
                      i.building = this.selectedAddress?.building || '',
                      i.floor = this.selectedAddress?.floor || '',
                      i.apartment = this.selectedAddress?.apartment || ''
                  })
                  localStorage.setItem('joincart', JSON.stringify(this.cartitems))
                  window.open(response?.message, '_top')
                  console.log(this.cartitems)
                }
              }, err => {
                this.checkoutLoading = false
              }
            )
          }
        }
      }
    )
  }
  checkout() {
    this.submitedCheckout = true
    this.notUserData = JSON.parse(localStorage.getItem('not_user_data'))
    if (!!localStorage.getItem('joinToken') == false && !this.notuserdataAdded) {
      this.notuserdataSubmited = false
      this.notUserDataForm.reset()
      this.notUserDataPopup = true
      console.log(this.notUserDataPopup)
    }else if(!!localStorage.getItem('joinToken') == false && this.notuserdataAdded) {
      if ((this.addressRequired && this.selectedAddress) || !this.addressRequired) {
        this.checkAvailableSeats()
      }
    }
     if(!!localStorage.getItem('joinToken')) {
      if ((this.addressRequired && this.selectedAddress) || !this.addressRequired) {
        this.checkAvailableSeats()
      }
    }
  }
  selectAddress(addressId) {
    this.selectedAddress = this.addresses.find(i => i?.id == addressId)
    console.log(this.selectedAddress)
  }

}
